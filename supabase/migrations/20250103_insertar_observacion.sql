-- Function to insert observation with location hierarchy lookup
CREATE OR REPLACE FUNCTION insertar_observacion(
    p_nombre_finca TEXT,
    p_nombre_bloque TEXT,
    p_nombre_cama TEXT,
    p_cantidad INTEGER,
    p_tipo_observacion TEXT,
    p_punto_gps_id UUID,
    p_creado_en TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    observacion_id UUID,
    finca_id UUID,
    bloque_id UUID,
    cama_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_finca_id UUID;
    v_bloque_id UUID;
    v_cama_id UUID;
    v_observacion_id UUID;
BEGIN
    -- Find or create finca
    SELECT id INTO v_finca_id
    FROM fincas
    WHERE nombre = p_nombre_finca
    LIMIT 1;

    IF v_finca_id IS NULL THEN
        INSERT INTO fincas (nombre)
        VALUES (p_nombre_finca)
        RETURNING id INTO v_finca_id;
    END IF;

    -- Find or create bloque
    SELECT id INTO v_bloque_id
    FROM bloques
    WHERE nombre = p_nombre_bloque
    AND finca_id = v_finca_id
    LIMIT 1;

    IF v_bloque_id IS NULL THEN
        INSERT INTO bloques (nombre, finca_id)
        VALUES (p_nombre_bloque, v_finca_id)
        RETURNING id INTO v_bloque_id;
    END IF;

    -- Find or create cama
    SELECT id INTO v_cama_id
    FROM camas
    WHERE nombre = p_nombre_cama
    AND bloque_id = v_bloque_id
    LIMIT 1;

    IF v_cama_id IS NULL THEN
        INSERT INTO camas (nombre, bloque_id)
        VALUES (p_nombre_cama, v_bloque_id)
        RETURNING id INTO v_cama_id;
    END IF;

    -- Insert observation
    INSERT INTO observaciones (
        cama_id,
        tipo_observacion,
        cantidad,
        punto_gps_id,
        creado_en
    )
    VALUES (
        v_cama_id,
        p_tipo_observacion,
        p_cantidad,
        p_punto_gps_id,
        p_creado_en
    )
    RETURNING id INTO v_observacion_id;

    -- Return the IDs
    RETURN QUERY SELECT
        v_observacion_id,
        v_finca_id,
        v_bloque_id,
        v_cama_id;
END;
$$;
