import { notFound, redirect } from "@tanstack/react-router";
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { auth } from "@/server/auth";

export const authMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session) {
      throw redirect({ to: "/login" });
    }

    return next({ context: { user: session.user } });
  },
);

export const adminMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session) {
      throw redirect({ to: "/login" });
    }

    if (session.user.role !== "admin") {
      throw notFound();
    }

    return next({ context: { user: session.user } });
  },
);

export const getSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    return session;
  },
);

// ============ User Types ============

export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  createdAt: Date;
}

// ============ User Admin RPC Functions ============

export const getAllUsers = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => {
    const headers = getRequestHeaders();
    const result = await auth.api.listUsers({
      query: {},
      headers,
    });

    return result;
  });

export const getUser = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator((data: string) => data)
  .handler(async ({ data: userId }): Promise<User> => {
    const headers = getRequestHeaders();
    const result = await auth.api.listUsers({
      query: {
        filterField: "id",
        filterValue: userId,
      },
      headers,
    });

    if (result.users.length !== 1) {
      throw new Error("User not found");
    }

    const user = result.users[0];

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator((data: { userId: string; role: "user" | "admin" }) => data)
  .handler(async ({ data, context }): Promise<void> => {
    // Prevent changing your own role
    if (data.userId === context.user.id) {
      throw new Error("Cannot change your own role");
    }

    const headers = getRequestHeaders();
    await auth.api.setRole({
      body: {
        userId: data.userId,
        role: data.role,
      },
      headers,
    });
  });
