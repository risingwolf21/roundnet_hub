import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ForgotPasswordScreen from '../features/auth/ForgotPasswordScreen';
import LoginScreen from '../features/auth/LoginScreen';
import RegisterScreen from '../features/auth/RegisterScreen';
import ResetPasswordScreen from '../features/auth/ResetPasswordScreen';
import { AuthCallback } from 'src/features/auth/AuthCallback';

const AuthPage = () => {
  return (
    <Routes>

      <Route path="/login" element={<LoginScreen />} />
      <Route path="/register" element={<RegisterScreen />} />
      <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
      <Route path="/reset-password" element={<ResetPasswordScreen />} />

      <Route path="/auth/callback" element={<AuthCallback />} />
      
      <Route path="*" element={<Navigate replace to={`/login`} />} />
    </Routes>
  );
};
export default AuthPage;
