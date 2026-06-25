CREATE OR REPLACE FUNCTION crear_venta_completa(
  p_negocio_id uuid,
  p_cajero_id uuid,
  p_cajero_nombre text,
  p_corte_id uuid,
  p_folio text,
  p_metodo_pago text,
  p_subtotal numeric,
  p_descuento_total numeric,
  p_total numeric,
  p_monto_recibido numeric,
  p_cambio numeric,
  p_monto_efectivo numeric,
  p_monto_tarjeta numeric,
  p_monto_transferencia numeric,
  p_notas text,
  p_items jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venta_id uuid;
  v_item jsonb;
  v_costo_total numeric := 0;
  v_utilidad_bruta numeric := 0;
  v_producto record;
BEGIN
  -- 1. Crear la venta
  INSERT INTO ventas (
    negocio_id, cajero_id, cajero_nombre, corte_id, folio,
    metodo_pago, subtotal, descuento_total, total,
    monto_recibido, cambio, monto_efectivo, monto_tarjeta,
    monto_transferencia, notas, estado,
    costo_total_snapshot, utilidad_bruta_snapshot, margen_snapshot
  ) VALUES (
    p_negocio_id, p_cajero_id, p_cajero_nombre, p_corte_id, p_folio,
    p_metodo_pago, p_subtotal, p_descuento_total, p_total,
    p_monto_recibido, p_cambio, p_monto_efectivo, p_monto_tarjeta,
    p_monto_transferencia, p_notas, 'pagada',
    0, 0, 0
  ) RETURNING id INTO v_venta_id;

  -- 2. Procesar cada item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Obtener producto para snapshot de costo
    SELECT costo_unitario, stock_actual INTO v_producto
    FROM productos
    WHERE id = (v_item->>'producto_id')::uuid
    AND negocio_id = p_negocio_id;

    -- Insertar detalle
    INSERT INTO detalle_ventas (
      venta_id, negocio_id, producto_id, producto_nombre,
      cantidad, precio_unitario_snapshot, costo_unitario_snapshot,
      subtotal, descuento, total, utilidad_snapshot
    ) VALUES (
      v_venta_id, p_negocio_id,
      (v_item->>'producto_id')::uuid,
      v_item->>'producto_nombre',
      (v_item->>'cantidad')::numeric,
      (v_item->>'precio_unitario')::numeric,
      COALESCE(v_producto.costo_unitario, 0),
      (v_item->>'subtotal')::numeric,
      COALESCE((v_item->>'descuento')::numeric, 0),
      (v_item->>'total')::numeric,
      ((v_item->>'precio_unitario')::numeric - COALESCE(v_producto.costo_unitario, 0))
        * (v_item->>'cantidad')::numeric
    );

    -- Acumular costo total
    v_costo_total := v_costo_total +
      COALESCE(v_producto.costo_unitario, 0) * (v_item->>'cantidad')::numeric;

    -- Descontar stock
    UPDATE productos
    SET stock_actual = stock_actual - (v_item->>'cantidad')::numeric
    WHERE id = (v_item->>'producto_id')::uuid
    AND negocio_id = p_negocio_id;

    -- Insertar movimiento de inventario (kardex)
    INSERT INTO movimientos_inventario (
      negocio_id, producto_id, producto_nombre,
      usuario_id, usuario_nombre,
      tipo_movimiento, cantidad,
      stock_anterior, stock_nuevo,
      costo_unitario, referencia_tipo, referencia_id
    ) VALUES (
      p_negocio_id,
      (v_item->>'producto_id')::uuid,
      v_item->>'producto_nombre',
      p_cajero_id, p_cajero_nombre,
      'salida_venta',
      (v_item->>'cantidad')::numeric,
      COALESCE(v_producto.stock_actual, 0),
      COALESCE(v_producto.stock_actual, 0) - (v_item->>'cantidad')::numeric,
      COALESCE(v_producto.costo_unitario, 0),
      'venta', v_venta_id
    );
  END LOOP;

  -- 3. Actualizar snapshots de costo/utilidad en la venta
  v_utilidad_bruta := p_total - v_costo_total;
  UPDATE ventas SET
    costo_total_snapshot = v_costo_total,
    utilidad_bruta_snapshot = v_utilidad_bruta,
    margen_snapshot = CASE WHEN p_total > 0
      THEN v_utilidad_bruta / p_total ELSE 0 END
  WHERE id = v_venta_id;

  RETURN json_build_object(
    'venta_id', v_venta_id,
    'folio', p_folio,
    'total', p_total,
    'costo_total', v_costo_total,
    'utilidad_bruta', v_utilidad_bruta
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error al crear venta: %', SQLERRM;
END;
$$;

-- Solo service_role puede llamar este RPC
REVOKE EXECUTE ON FUNCTION crear_venta_completa FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION crear_venta_completa TO service_role;
