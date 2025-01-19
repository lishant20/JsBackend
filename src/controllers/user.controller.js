import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js';

const registerUser = asyncHandler(async (req,res) => {
  //get user details from frontend(postman)
  //validation(email empyt/correct format)
  //check if user already exists: username,email
  //files xah ki nai: image,avatar
  //upload them to cloudinary, avatar
  //create user object- create entry in db
  //remove password and refresh token from response(user lai)
  //check for user creation
  //return response

  //form or json bata data ako xah vane .body Destructure garne
  const {fullName, email, username, password} = req.body
  console.log('Email: ', email);

  //file handle garnah sakinnah data matra sakinxah
  //so routes mah janne
  //validation ko lagi following
  // if(fullName === "") {
  //   throw new ApiError(400, "fullname is required")
  // }
  if(
    [fullName, email, username, password].some((field) => 
    field?.trim() === "")
  ){
    throw new ApiError(404, "All fields are required")
  }
  //user already exists?-user.model-db sanga direct contact garxah
  //bcoz mongoose leh model create gareko ho.Aba user nai hamro behalf mah call 
  //garxah mongodb lai(any number of time)
  const existedUser = User.findOne({
    $or: [{ username },{ email }]
  })

  if(existedUser) {
    throw new ApiError(409, "User with email or username already exists")
  }

  //img and avater xah ki nai req.body-express req.files-multer
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;
  //localPath kinah vane yo server mah xah cloudinary mah gako xainah

  if(!avatarLocalPath) {
    throw new ApiError(400,"Avatar file is required")
  }

  //upload them to cloudinary, avatar
  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if(!avatar) {
    throw new ApiError(400,"Avatar file is required")
  }

  //create user object- create entry in db
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
  })

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )

  if(!createdUser) {
    throw new ApiError(500,"Something went wrong while registering the user")
  }

  //response ko lagi properly
  return res.status(201).json(
    new ApiResponse(200,createdUser, "User registered successfully")
  )
})

export {registerUser}