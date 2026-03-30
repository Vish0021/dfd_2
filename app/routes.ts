import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("store/:storeId", "routes/store.$storeId.tsx"),
  route("order/:orderId", "routes/order.$orderId.tsx"),
  route("checkout", "routes/checkout.tsx"),
  route("merchant/dashboard", "routes/merchant.dashboard.tsx"),
  route("merchant/catalog", "routes/merchant.catalog.tsx"),

  // Admin dashboard — role-guarded layout
  layout("routes/admin.tsx", [
    route("admin/orders", "routes/admin.orders.tsx"),
    route("admin/stores", "routes/admin.stores.tsx"),
    route("admin/items", "routes/admin.items.tsx"),
  ]),

  // User App — layout with bottom tab navigation
  layout("routes/user.tsx", [
    route("user", "routes/user.home.tsx"),
    route("user/orders", "routes/user.orders.tsx"),
    route("user/profile", "routes/user.profile.tsx"),
  ]),
] satisfies RouteConfig;
