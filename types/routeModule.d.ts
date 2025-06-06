type Methods = "post" | "get";

export declare enum PERMISSIONS {
  QUERY = "query"
}

export type RouteModule = {
  method: Methods,
  route: string,
  skipLoad: boolean,
  inputQuery?: boolean,
  permissions?: PERMISSIONS[],
  main: Function
}