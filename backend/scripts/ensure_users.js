const { User, sequelize } = require('../src/db/models');
const bcrypt = require('bcryptjs');

const targetUsers = [
  {
    name: 'Admin User',
    email: 'divyansh.osop@gmail.com',
    password: 'admin123',
    role: 'ADMIN'
  },
  {
    name: 'Editor User',
    email: 'dharmendra.bajpai@gmail.com',
    password: 'editor123',
    role: 'EDITOR'
  },
  {
    name: 'Viewer User',
    email: 'sanveerchhabra@gmail.com',
    password: 'super123',
    role: 'VIEWER'
  }
];

async function ensureUsers() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connected.');

    // --- SCHEMA FIX START ---
    const queryInterface = sequelize.getQueryInterface();
    const tableDescription = await queryInterface.describeTable('users');

    if (!tableDescription.role) {
      console.log('Column "role" missing in users table. Fixing schema...');
      
      // Add role column
      await sequelize.query("ALTER TABLE users ADD COLUMN role ENUM('ADMIN', 'EDITOR', 'VIEWER') DEFAULT 'VIEWER';");
      console.log('Added "role" column.');

      // Remove role_id if exists
      if (tableDescription.role_id) {
         try {
             // Drop FK first if exists. Name is usually users_role_id_foreign_idx or similar.
             // We'll try to drop the column directly, if it fails due to FK, we catch it.
             // But first, let's try to find the FK constraint name.
             const [constraints] = await sequelize.query(`
                SELECT CONSTRAINT_NAME 
                FROM information_schema.KEY_COLUMN_USAGE 
                WHERE TABLE_NAME = 'users' 
                AND COLUMN_NAME = 'role_id' 
                AND TABLE_SCHEMA = '${sequelize.config.database}';
             `);
             
             for (const constraint of constraints) {
                 await sequelize.query(`ALTER TABLE users DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME};`);
                 console.log(`Dropped FK: ${constraint.CONSTRAINT_NAME}`);
             }

             await sequelize.query("ALTER TABLE users DROP COLUMN role_id;");
             console.log('Dropped "role_id" column.');
         } catch (e) {
             console.warn('Could not drop role_id:', e.message);
         }
      }
    }

    // Drop roles table if exists (since we deleted the model)
    try {
        await sequelize.query("DROP TABLE IF EXISTS roles;");
        console.log('Dropped "roles" table (if existed).');
    } catch (e) {
        console.warn('Could not drop roles table:', e.message);
    }
    // --- SCHEMA FIX END ---

    for (const u of targetUsers) {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(u.password, salt);

      const [user, created] = await User.findOrCreate({
        where: { email: u.email },
        defaults: {
          name: u.name,
          password_hash,
          role: u.role,
          status: 'ACTIVE'
        }
      });

      if (!created) {
        // Update existing user to ensure correct role and password
        user.name = u.name;
        user.password_hash = password_hash;
        user.role = u.role;
        user.status = 'ACTIVE';
        await user.save();
        console.log(`Updated user: ${u.email} (${u.role})`);
      } else {
        console.log(`Created user: ${u.email} (${u.role})`);
      }
    }

    // Ensure only one admin exists
    const { Op } = require('sequelize');
    const otherAdmins = await User.findAll({
      where: {
        role: 'ADMIN',
        email: { [Op.ne]: 'divyansh.osop@gmail.com' }
      }
    });

    if (otherAdmins.length > 0) {
      console.log(`Found ${otherAdmins.length} other admins. Demoting to VIEWER...`);
      for (const admin of otherAdmins) {
        admin.role = 'VIEWER';
        await admin.save();
        console.log(`Demoted ${admin.email} to VIEWER`);
      }
    } else {
      console.log('No other admins found. Access control verified.');
    }

    console.log('User synchronization complete.');
  } catch (error) {
    console.error('Error ensuring users:', error);
  } finally {
    await sequelize.close();
  }
}

ensureUsers();
