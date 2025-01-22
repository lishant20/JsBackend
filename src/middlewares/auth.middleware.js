import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import {User} from  "../models/user.model.js";

//verify garxah user xah ki nai vanerah(authenticated)
export const verifyJWT = asyncHandler(async(req, _,next) => {
  //token ko access
  //req sanga cookie ko access xah cookie-parser app.js bata
  try {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
    
    console.log(token);
    if(!token) {
      throw new ApiError(401, "Unauthorized request")
    }
  
    //token right xah ki nai 
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
  
    const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
  
    if(!user) {
      throw new ApiError(401, "Invalid Access Token")
    }
  
    //(req, _,next) mah req ko access xah tesmah naya object add 
    // gareko rah tesmah user ko access deko ani kam vayesi next()
    req.user = user;
    next()
    //middleware use usually routes mah auxah
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token")
  }
})