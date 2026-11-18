\set ON_ERROR_STOP on
-- Separate acquisition only. No expected fingerprint is supplied or inferred.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL search_path=pg_catalog,pg_temp;
SET LOCAL statement_timeout='5s';
SET LOCAL lock_timeout='2s';
SET LOCAL idle_in_transaction_session_timeout='10s';
SELECT json_build_object(
 'database',current_database(),'sessionUser',session_user,'currentUser',current_user,
 'versionNum',current_setting('server_version_num'),
 'databaseOid',(SELECT oid::text FROM pg_catalog.pg_database WHERE datname=current_database()),
 'serverAddress',inet_server_addr()::text,'serverPort',inet_server_port(),
 'readOnly',current_setting('transaction_read_only'),
 'isolation',current_setting('transaction_isolation'));
ROLLBACK;
