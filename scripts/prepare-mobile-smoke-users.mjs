import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL, { max: 1 });

async function upsertUser({ email, name, role, passwordHash }) {
  await sql`
    insert into users (name, email, password_hash, role)
    values (${name}, ${email}, ${passwordHash}, ${role})
    on conflict (email) do update set
      name = excluded.name,
      role = excluded.role
  `;
}

try {
  const [sourceUser] = await sql`
    select password_hash
    from users
    where email = 'test@test.com'
    limit 1
  `;

  if (!sourceUser) {
    throw new Error('Seed user test@test.com was not found.');
  }

  await upsertUser({
    email: 'mobile-admin@gasbite.local',
    name: 'Mobile Admin',
    role: 'main_admin',
    passwordHash: sourceUser.password_hash,
  });

  await upsertUser({
    email: 'mobile-driver@gasbite.local',
    name: 'Mobile Driver',
    role: 'fuel_driver',
    passwordHash: sourceUser.password_hash,
  });

  const [driverUser] = await sql`
    select id
    from users
    where email = 'mobile-driver@gasbite.local'
  `;

  await sql`
    insert into drivers (user_id, active, availability_status)
    values (${driverUser.id}, true, 'available')
    on conflict do nothing
  `;

  console.log('Mobile smoke users are ready.');
} finally {
  await sql.end();
}
