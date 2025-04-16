import admin from 'firebase-admin';
import { readFile } from 'fs/promises';

// Read the service account key file
const serviceAccount = JSON.parse(
  await readFile(new URL('./config/service-account-key.json', import.meta.url))
);

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

function generateSecurePassword() {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  
  let password = '';
  // Ensure at least one of each required character type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Add more random characters to meet minimum length
  const allChars = uppercase + lowercase + numbers + special;
  while (password.length < 12) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

async function updateUserRole(email, role) {
  try {
    let user;
    try {
      // Try to get the user by email
      user = await admin.auth().getUserByEmail(email);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // If user doesn't exist, create them
        console.log(`User ${email} not found. Creating new user...`);
        const password = generateSecurePassword();
        user = await admin.auth().createUser({
          email: email,
          password: password,
          emailVerified: true
        });
        console.log(`Created new user with password: ${password}`);
        console.log('Please save this password as it will not be shown again!');
      } else {
        throw error;
      }
    }
    
    // Update the user's role in Firestore
    await db.collection('users').doc(user.uid).set({
      role: role,
      email: email,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(`Successfully updated role for ${email} to ${role}`);
  } catch (error) {
    console.error('Error updating user role:', error);
  }
}

// Get command line arguments
const [,, email, role] = process.argv;

if (!email || !role) {
  console.error('Please provide email and role as arguments');
  console.error('Usage: node update-role.js <email> <role>');
  process.exit(1);
}

// Run the update
await updateUserRole(email, role); 