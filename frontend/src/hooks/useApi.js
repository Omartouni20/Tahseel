// src/hooks/useApi.js
import { useEffect, useMemo } from "react";
import axios from "axios";

export function useApi() {
  const token = localStorage.getItem("token");

  // ✅ خليه يعتمد دايمًا على الـ VITE_API_URL من .env
const baseURL = process.env.REACT_APP_API_URL;

  // نِنشئ axios instance مرة واحدة حسب الـ token
  const api = useMemo(() => {
    return axios.create({
      baseURL,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }, [token, baseURL]);

  // Interceptors + لوجز تشخيص على كل request/response
  useEffect(() => {
    const reqId = () => Math.random().toString(36).slice(2, 7);

    const onReq = (config) => {
      const id = reqId();
      config.headers["X-Debug-ReqId"] = id;
      console.log(
        "[API→] Req",
        id,
        (config.method || "GET").toUpperCase(),
        config.url,
        { params: config.params, data: config.data }
      );
      return config;
    };
    const onReqErr = (error) => {
      console.log("[API→] ReqError", error?.message, error);
      return Promise.reject(error);
    };

    const onRes = (response) => {
      const id = response.config.headers["X-Debug-ReqId"];
      console.log("[API←] Res", id, response.config.url, {
        status: response.status,
        count: Array.isArray(response.data) ? response.data.length : null,
        // data: response.data, // شيل الكومنت لو عايز تشوف الداتا كاملة
      });
      return response;
    };
    const onResErr = (error) => {
      const cfg = error?.config || {};
      console.log(
        "[API←] ResError",
        cfg.url,
        error?.response?.status,
        error?.response?.data || error?.message
      );
      return Promise.reject(error);
    };

    const i1 = api.interceptors.request.use(onReq, onReqErr);
    const i2 = api.interceptors.response.use(onRes, onResErr);
    return () => {
      api.interceptors.request.eject(i1);
      api.interceptors.response.eject(i2);
    };
  }, [api]);

  return api;
}
