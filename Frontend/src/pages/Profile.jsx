import React from "react";
import useAuth from "../auth/useAuth";
import Card from "../components/Card";

export default function Profile() {
  const { user } = useAuth();

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Profile</h2>
      <Card>
        <div className="space-y-2">
          <div><strong>Name:</strong> {user?.name}</div>
          <div><strong>Email:</strong> {user?.email}</div>
          <div><strong>Role:</strong> {user?.role}</div>
          <div><strong>Department:</strong> {user?.department}</div>
        </div>
      </Card>
    </div>
  );
}