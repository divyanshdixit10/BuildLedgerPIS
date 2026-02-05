import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const Unauthorized = () => {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md text-center shadow-lg border-red-100">
        <CardHeader className="pb-2">
          <div className="flex justify-center mb-4">
            <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center">
              <ShieldAlert className="h-10 w-10 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Access Denied</CardTitle>
          <CardDescription className="text-gray-500">
            You do not have permission to access this page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mt-4 flex justify-center">
            <Link to="/dashboard">
              <Button className="bg-blue-600 hover:bg-blue-700">
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Unauthorized;
