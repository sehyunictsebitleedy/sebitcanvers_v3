import { lazy, Suspense } from "react";
import App from "./App";
const AdminPage = lazy(() => import("./cms/CmsPage").then(module => ({ default: module.AdminPage })));
const PublicDashboard = lazy(() => import("./cms/CmsPage").then(module => ({ default: module.PublicDashboard })));
export function Entry() {
  return <Suspense fallback={<p role="status">화면을 준비하고 있습니다.</p>}>
    {location.pathname === "/admin" || location.pathname === "/admin/" ? <AdminPage /> : location.pathname === "/dashboard" || location.pathname === "/dashboard/" ? <PublicDashboard /> : <App />}
  </Suspense>;
}
