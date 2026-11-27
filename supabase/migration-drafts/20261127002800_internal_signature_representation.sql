-- B1 local draft only. Historical signing events and documents are not rewritten.
BEGIN;
DO $guard$ BEGIN RAISE EXCEPTION 'LOCAL DESIGN ONLY: B1 native acceptance and rollout deferred'; END $guard$;
SET LOCAL search_path=pg_catalog,pg_temp;
CREATE FUNCTION app_private.b1_capture_valid(cap jsonb) RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog,pg_temp AS $f$
DECLARE stroke jsonb;point jsonb;prior jsonb;total integer:=0;movement boolean:=false;BEGIN
 IF jsonb_typeof(cap) IS DISTINCT FROM 'object' OR octet_length(cap::text)>30000 OR EXISTS(SELECT 1 FROM jsonb_object_keys(cap) k WHERE k NOT IN('typedName','reviewed','identityConfirmed','consent','consentVersion','reviewedChecksum','drawing','drawingNotice','executionRecordVersion')) OR
 jsonb_typeof(cap->'typedName') IS DISTINCT FROM 'string' OR length(btrim(cap->>'typedName')) NOT BETWEEN 2 AND 100 OR cap->>'typedName' ~ '[[:cntrl:]]' OR cap->'reviewed' IS DISTINCT FROM 'true'::jsonb OR cap->'identityConfirmed' IS DISTINCT FROM 'true'::jsonb OR cap->'consent' IS DISTINCT FROM 'true'::jsonb OR
 COALESCE(cap->>'consentVersion','') NOT IN('simple-fr-v1','simple-ar-v1') OR COALESCE(cap->>'reviewedChecksum','') !~ '^[a-f0-9]{64}$' THEN RETURN false;END IF;
 IF cap?'executionRecordVersion' AND cap->>'executionRecordVersion' IS DISTINCT FROM 'b1-v1' THEN RETURN false;END IF;
 IF NOT(cap?'drawing') THEN RETURN NOT(cap?'drawingNotice');END IF;
 IF jsonb_typeof(cap->'drawing') IS DISTINCT FROM 'object' OR cap->'drawing'->>'version' IS DISTINCT FROM 'drawn-v1' OR (SELECT count(*) FROM jsonb_object_keys(cap->'drawing'))<>2 OR jsonb_typeof(cap->'drawing'->'strokes') IS DISTINCT FROM 'array' THEN RETURN false;END IF;
 IF cap->>'drawingNotice' IS DISTINCT FROM (CASE cap->>'consentVersion' WHEN 'simple-fr-v1' THEN 'Le dessin accompagne mon nom saisi. Il est une représentation visuelle, pas une preuve indépendante d’identité ni une signature cryptographique.' ELSE 'يرافق الرسم اسمي المكتوب. وهو تمثيل بصري، وليس دليلاً مستقلاً على الهوية أو توقيعاً تشفيرياً.' END) THEN RETURN false;END IF;
 IF jsonb_array_length(cap->'drawing'->'strokes') NOT BETWEEN 1 AND 20 THEN RETURN false;END IF;
 FOR stroke IN SELECT value FROM jsonb_array_elements(cap->'drawing'->'strokes') LOOP
  IF jsonb_typeof(stroke) IS DISTINCT FROM 'array' THEN RETURN false;END IF;
  IF jsonb_array_length(stroke) NOT BETWEEN 2 AND 160 THEN RETURN false;END IF;
  total:=total+jsonb_array_length(stroke);IF total>1000 THEN RETURN false;END IF;prior:=NULL;
  FOR point IN SELECT value FROM jsonb_array_elements(stroke) LOOP
   IF jsonb_typeof(point) IS DISTINCT FROM 'array' THEN RETURN false;END IF;
   IF jsonb_array_length(point)<>2 OR jsonb_typeof(point->0) IS DISTINCT FROM 'number' OR jsonb_typeof(point->1) IS DISTINCT FROM 'number' THEN RETURN false;END IF;
   IF (point->>0)::numeric NOT BETWEEN 0 AND 1000 OR (point->>1)::numeric NOT BETWEEN 0 AND 1000 OR (point->>0)::numeric<>trunc((point->>0)::numeric) OR (point->>1)::numeric<>trunc((point->>1)::numeric) THEN RETURN false;END IF;
   IF prior IS NOT NULL AND prior<>point THEN movement:=true;END IF;prior:=point;
  END LOOP;
 END LOOP;RETURN movement;
END $f$;
ALTER FUNCTION app_private.signing_command(uuid,uuid,text,text,jsonb) RENAME TO signing_command_before_b1;
CREATE FUNCTION app_private.signing_command(aid uuid,actor uuid,token text,action text,p jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE cap jsonb;BEGIN
 IF action IN('stage-agency','agency-sign','client-sign') THEN
  cap:=CASE WHEN action='client-sign' THEN (p->>'captureText')::jsonb ELSE (p->'intent'->>'captureText')::jsonb END;
  IF NOT app_private.b1_capture_valid(cap) THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
 END IF;
 RETURN app_private.signing_command_before_b1(aid,actor,token,action,p);
END $f$;
REVOKE ALL ON FUNCTION app_private.b1_capture_valid(jsonb),app_private.signing_command(uuid,uuid,text,text,jsonb),app_private.signing_command_before_b1(uuid,uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.b1_capture_valid(jsonb),app_private.signing_command(uuid,uuid,text,text,jsonb),app_private.signing_command_before_b1(uuid,uuid,text,text,jsonb) TO contratpro_rental_writer;
ROLLBACK;
