import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import { GuardianDemo } from "../components/GuardianDemo";

export const guardianRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/guardian",
  component: GuardianDemo,
});
