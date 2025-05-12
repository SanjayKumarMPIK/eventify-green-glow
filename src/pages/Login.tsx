
import { AuthForm } from "@/components/AuthForm";
import { Layout } from "@/components/Layout";

const Login = () => {
  return (
    <Layout>
      <div className="container py-8">
        <AuthForm type="login" />
      </div>
    </Layout>
  );
};

export default Login;
