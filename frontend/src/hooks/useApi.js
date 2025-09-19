// src/hooks/useApi.js
import { useEffect, useMemo } from "react";
import axios from "axios";

export function useApi() {
  const token = localStorage.getItem("token");

  // 👇 تأكد إن /api دايمًا مضافة هنا
  const baseURL = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "") + "/api";

  const api = useMemo(() => {
    return axios.create({
      baseURL,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }, [token, baseURL]);

  useEffect(() => {
    const reqId = () => Math.random().toString(36).slice(2, 7);

    const onReq = (config) => {
      const id = reqId();
      config.headers["X-Debug-ReqId"] = id;
      console.log("[API→]", id, config.method?.toUpperCase(), config.url, { params: config.params, data: config.data });
      return config;
    };
    const onRes = (res) => {
      const id = res.config.headers["X-Debug-ReqId"];
      console.log("[API←]", id, res.config.url, res.status);
      return res;
    };
    const onErr = (err) => {
      console.error("[API ERR]", err?.config?.url, err?.response?.status, err?.response?.data || err.message);
      return Promise.reject(err);
    };

    const i1 = api.interceptors.request.use(onReq, onErr);
    const i2 = api.interceptors.response.use(onRes, onErr);
    return () => {
      api.interceptors.request.eject(i1);
      api.interceptors.response.eject(i2);
    };
  }, [api]);

  return api;
}
