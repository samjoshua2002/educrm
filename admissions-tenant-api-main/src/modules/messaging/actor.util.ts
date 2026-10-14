import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity.js';

export interface Actor {
  id: string | null;
  name: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
}

/** Resolves the signed-in staff member (req.user only carries id / role). */
export async function resolveActor(dataSource: DataSource, req: any): Promise<Actor> {
  const id: string | null = req?.user?.sub || null;
  const role: string | null = req?.user?.role || null;
  if (!id) return { id: null, name: null, role, email: null, phone: null };
  try {
    const user = await dataSource.getRepository(User).findOne({ where: { id } });
    return { id, name: user?.name || null, role, email: user?.email || null, phone: user?.phone || null };
  } catch {
    return { id, name: null, role, email: req?.user?.email || null, phone: null };
  }
}
