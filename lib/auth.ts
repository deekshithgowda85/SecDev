import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    accessToken?: string;
    user: {
      id?: string;
    } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.CLIENT_ID!,
      clientSecret: process.env.CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      // Expose stable user ID (GitHub provider sets sub = GitHub user numeric ID)
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
