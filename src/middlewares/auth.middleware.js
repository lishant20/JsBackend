import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken"
import {User} from  "../models/user.model";

//verify garxah user xah ki nai vanerah(authenticated)
export const verifyJWT = asyncHandler(async(req, _,next) => {
  //token ko access
  //req sanga cookie ko access xah cookie-parser app.js bata
  try {
    const token = req.cookies?.accessToken || req.header
    ("Authorization")?.replace("Bearer ", "")
  
    if(!token) {
      throw new ApiError(401, "Unauthorized request")
    }
  
    //token right xah ki nai 
    const decodedToken = jwt.verify(token, proccess.env.ACCESS_TOKEN_SECRET)
  
    const user = await User.findById(decodedToken?._id).select
    ("-password -refreshToken")
  
    if(!user) {
      throw new ApiError(401, "Invalid Access Token")
    }
  
    req.user = user;
    next()
  } catch (error) {
    throw new ApiError(401, error?.message || 
    "Invalid access token")
  }
})