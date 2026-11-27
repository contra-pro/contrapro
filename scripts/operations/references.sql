-- Read-only; execute only during an authorized write freeze using PGSERVICE.
SELECT COALESCE(jsonb_agg(x),'[]') FROM (
 SELECT DISTINCT key,checksum AS sha256,state='retained' AS required FROM app_private.contract_objects c
  WHERE NOT EXISTS(SELECT 1 FROM app_private.maintenance_inventory i WHERE i.agency_id=c.agency_id AND i.key=c.key AND i.state='deleted')
 UNION SELECT DISTINCT key,checksum,state='attached' FROM app_private.agency_logo_objects
 UNION SELECT DISTINCT key,checksum,retained FROM app_private.signing_objects
) x;
