import { validateUserInput } from "./users.validation.js";
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

export async function create(req: Request, res: Response) {
  const input = validateUserInput(req.body);
  const user = await userService.createUser(input);

  res.status(201).location(`/users/${user.id}`).json(user);
}

export async function replace(req: Request<{ id: string }>, res: Response) {
  const id = parseId(req.params.id);
  const input = validateUserInput(req.body);
  const user = await userService.replaceUser(id, input);
  res.json(user);
}

export async function remove(req: Request<{ id: string }>, res: Response) {
  const id = parseId(req.params.id);
  await userService.deleteUser(id);
  res.status(204).end();
}
