import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ForgotPasswordScreen from '../features/auth/ForgotPasswordScreen';
import LoginScreen from '../features/auth/LoginScreen';
import RegisterScreen from '../features/auth/RegisterScreen';
import ResetPasswordScreen from '../features/auth/ResetPasswordScreen';

const AuthPage = () => {
  console.log("auht page")
  return (
    <Routes>
      <Route path="/" element={<Navigate replace to={`/login`} />} />
      <Route path="*" element={<Navigate replace to={`/login`} />} />

      <Route path="/login" element={<LoginScreen />} />
      <Route path="/register" element={<RegisterScreen />} />
      <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
      <Route path="/reset-password" element={<ResetPasswordScreen />} />
    </Routes>
  );
};
export default AuthPage;
