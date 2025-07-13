# Instructions to Subscribe to EC2 replica of postgres database

0. Add you IP address to the `pg-subscriber-sg` security group - us-west-2 region

security group id: `sg-0a79b92649ae5df7a`

type: PostgreSQL
source: custom
your IP ( run `curl ifconfig.me` locally)

1. Create database locally

`sudo -u postgres createdb error_analysis_phoenix`


2. Get schema from public EC2

`pg_dump -h 44.250.154.32 -U dev_user -d error_analysis_phoenix_ec2 --schema-only --no-owner --no-privileges > schema.sql`

password is `dev_password`

3. Set up local postgres

	1. Find the `postgresql.conf` locally to modify

```
psql -U postgres -c "SHOW config_file;"
```

	2. edit with preferred text editor

```
nano /usr/local/var/postgres/postgresql.conf

```

	3. edit according to below settings

```
wal_level = logical
max_replication_slots = 4
max_wal_senders = 10
```


4. Create the subscription

```
CREATE SUBSCRIPTION ec2_sub
  CONNECTION 'host=44.250.154.32 port=5432 dbname=error_analysis_phoenix_ec2 user=dev_user password=dev_password'
  PUBLICATION ec2_pub;
```

5. Monitor the subscription, run this from the new `error_analysis_phoenix` database

```
SELECT 
    c.relname,
    sr.srsubstate,
    CASE sr.srsubstate 
        WHEN 'd' THEN 'Copying data'
        WHEN 's' THEN 'Synchronized' 
        WHEN 'r' THEN 'Ready'
        WHEN 'i' THEN 'Initializing'
    END as status
FROM pg_subscription_rel sr
JOIN pg_class c ON sr.srrelid = c.oid
WHERE sr.srsubid = (SELECT oid FROM pg_subscription WHERE subname = 'ec2_sub')
ORDER BY sr.srsubstate, c.relname;
```

6. Verify data is copied successfully
```
-- Check key tables periodically
SELECT COUNT(*) FROM spans;
SELECT COUNT(*) FROM projects;
SELECT COUNT(*) FROM traces;
```

should be at least 2 projects, at least 12 spans