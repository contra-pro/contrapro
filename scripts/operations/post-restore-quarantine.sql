-- Execute ONLY against an isolated, reviewed restored copy before app/worker access.
-- Do not release holds until each external system has been reconciled independently.
BEGIN;
UPDATE app_private.maintenance_schedules SET enabled=false,lease=NULL,lease_until=NULL;
UPDATE app_private.maintenance_policies SET delete_enabled=false;
UPDATE app_private.maintenance_rotations SET enabled=false;
UPDATE app_private.reminder_policies SET enabled=false,manual_enabled=false,revision=revision+1;
UPDATE app_private.delivery_jobs SET state='uncertain',retryable=false,lease=NULL,lease_until=NULL,error_code='transport-unknown'
 WHERE state IN('queued','processing','failed','accepted');
UPDATE app_private.delivery_events SET state='failed',lease=NULL,lease_until=NULL,error_code='restore-hold' WHERE state IN('pending','processing');
UPDATE app_private.sheets_jobs SET state='reconciliation-required',retryable=false,lease=NULL,lease_until=NULL,error_code='restore-hold'
 WHERE state IN('pending','processing','failed','paused');
UPDATE app_private.sheets_connections SET refresh_lease=NULL,refresh_until=NULL,refresh_armed=false,enabled=false;
UPDATE app_private.billing_provider_operations SET state='uncertain' WHERE state='prepared';
UPDATE app_private.signing_provider_operations SET state='unknown' WHERE state='claimed';
INSERT INTO app_private.maintenance_audit(action,detail) VALUES('restore.quarantine','{"externalReplay":"blocked","requires":"independent reconciliation"}');
COMMIT;
