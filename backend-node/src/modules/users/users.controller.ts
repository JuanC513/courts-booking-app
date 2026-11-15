import type { Request, Response } from "express";
import { parseId } from "../../validation/parse-id.js";
import * as userService from "./users.service.js";

export async function list(_req: Request, res: Response) {
  const users = await userService.listUsers();
  res.json(users);
}

export async function getById(req: Request<{ id: string }>, res: Response) {
  const id = parseId(req.params.id);
  const user = await userService.getUser(id);
  res.json(user);
}
