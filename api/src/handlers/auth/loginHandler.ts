import { UserModel } from "../../models/user.model";

export async function handleLogin(email: string, password: string) {
    const user = await UserModel.findByEmail(email);
  
    if (!user) {
      throw new Error('Invalid email or password');
    }
  
    const isPasswordValid = await UserModel.validatePassword(user,password);
  
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }
  
    return user;
  }
  
  