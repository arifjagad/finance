import React from "react";
import { Navigate } from "react-router-dom";
import { AuthForm } from "@/components/auth/auth-form";
import { useAuth } from "@/contexts/auth-context";

export function AuthPage() {
  const { session, isLoading } = useAuth();

  // If already logged in, redirect to dashboard
  if (session && !isLoading) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left side - Brand/Logo */}
        <div className="md:w-1/2 bg-gradient-to-br from-teal-500 to-violet-600 p-8 md:p-12 text-white flex flex-col justify-center items-center">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">FinTrack</h1>
            <p className="text-lg md:text-xl opacity-90 mb-6">
              Your personal finance tracker to help you manage money smarter.
            </p>
            <div className="space-y-4 text-left">
              <div className="flex items-start space-x-3">
                <div className="bg-white bg-opacity-20 p-1 rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium">Track Expenses</h3>
                  <p className="opacity-80 text-sm">
                    Easily keep track of where your money is going
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-white bg-opacity-20 p-1 rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium">Set Goals</h3>
                  <p className="opacity-80 text-sm">
                    Create and monitor your savings goals
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-white bg-opacity-20 p-1 rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium">Visualize Data</h3>
                  <p className="opacity-80 text-sm">
                    View insightful charts and analytics
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Auth Form */}
        <div className="md:w-1/2 p-8 flex items-center justify-center">
          <div className="w-full max-w-md">
            <AuthForm />
          </div>
        </div>
      </div>
    </div>
  );
}