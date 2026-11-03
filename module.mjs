// @ts-check
import { module } from "@prisma/composer";
import pustakbdService from "./service.mjs";

export default module("pustakbd", ({ provision }) => {
  provision(pustakbdService);
});
