import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authConfig } from "./authconfig";
import { connectToDB } from "./lib/utils";
import { User } from "./lib/models";
import bcrypt from "bcrypt";

const login = async (credentials) => {
  try {
    console.log("Connecting to DB...");
    connectToDB();
    console.log("Attempting to find user with username:", credentials.username);
    const user = await User.findOne({ username: credentials.username });

    if (!user) {
      console.log("No user found with that username.");
      throw new Error("Wrong credentials!");
    }

    if (!user.isAdmin) {
      console.log("User is not an admin.");
      throw new Error("Wrong credentials!");
    }

    let isPasswordCorrect = false;

    // Check if the password is in plaintext (for backward compatibility)
    if (user.password === credentials.password) {
      console.log("Plaintext password match found.");
      isPasswordCorrect = true;
    } else {
      // If not plaintext, check against the bcrypt hash
      isPasswordCorrect = await bcrypt.compare(credentials.password, user.password);
      console.log("Password match status with bcrypt:", isPasswordCorrect);
    }

    if (!isPasswordCorrect) {
      console.log("Password is incorrect.");
      throw new Error("Wrong credentials!");
    }

    console.log("Login successful for user:", user.username);
    return user;
  } catch (err) {
    console.log("Error during login process:", err.message);
    throw new Error("Failed to login!");
  }
};


export const { signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        console.log("Starting authorization with credentials:", credentials);
        try {
          const user = await login(credentials);
          console.log("Authorization successful for user:", user.username);
          return user;
        } catch (err) {
          console.log("Authorization failed:", err.message);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        console.log("JWT callback - setting token for user:", user.username);
        token.username = user.username;
        token.img = user.img;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        console.log("Session callback - setting session for token with username:", token.username);
        session.user.username = token.username;
        session.user.img = token.img;
      }
      return session;
    },
  },
});
