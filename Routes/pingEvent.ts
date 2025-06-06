import { RouteModule } from "../types/routeModule";

async function pingEvent(req, res, GLOBAL_OBJECTS) {
  return res.send({ time: Date.now() });
}

const mod: RouteModule = {
  method: "get",
  route: "/ping",
  skipLoad: false,
  main: pingEvent
}

export default mod;