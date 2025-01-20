import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js';

const generateAccessAndRefreshTokens = async(userId) => 
{
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken() 
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false }) 

    return {accessToken, refreshToken}
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generation refresh and access token")
  }
}

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
  //console.log('Email: ', email);

  //file handle garnah sakinnah data matra sakinxah
  //so routes mah janne
  //validation ko lagi following
  // if(fullName === "") {
  //   throw new ApiError(400, "fullname is required")
  // }
  //empty xah ki nai
  if(
    [fullName, email, username, password].some((field) => 
    field?.trim() === "")
  ){
    throw new ApiError(404, "All fields are required")
  }
  //user already exists?-user.model-db sanga direct contact garxah
  //bcoz mongoose leh model create gareko ho.Aba user nai hamro behalf mah call 
  //garxah mongodb lai(any number of time)
  const existedUser = await User.findOne({
    $or: [{ username },{ email }]
  })

  if(existedUser) {
    throw new ApiError(409, "User with email or username already exists")
  }

  //console.log(req.files);

  //img and avater xah ki nai req.body-express req.files-multer
  const avatarLocalPath = req.files?.avatar[0]?.path;
  //const coverImageLocalPath = req.files?.coverImage[0]?.path;
  //localPath kinah vane yo server mah xah cloudinary mah gako xainah

  let coverImageLocalPath;
  if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path
  }

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


const loginUser = asyncHandler(async(req,res) => {
  // req.body -> data
  //check username or email
  //find the user
  //if user check password
  //if checked, generate access and refresh token
  //send token in cookie

  const {email, username, password} = req.body

  if(!username || !email) {
    throw new ApiError(400,"username or email is required")
  }

  const user = await User.findOne({
    $or: [{username}, {email}]
  })

  if(!user) {
    throw new ApiError(404, "User does not exists")
  }

  const isPasswordValid = await user.isPasswordCorrect(password)  

  if(!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials")
  }

  const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

  const loggedInUser = await User.findById(user._id).
  select("-password -refreshToken") 

  //cookies mah pathaunah tara khako cookies mah pthaune ?
  //options design garnu parxah
  const options = {
    httpOnly: true,  //frontend bata not modifiable only server
    secure: true
  }

  return res
  .status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", refreshToken, options)
  .json(
    new ApiResponse(
      200,
      {
        user: loggedInUser, accessToken,
        refreshToken
      },
      "User logged In Successfully"
    )
  )
  //159 - cookie mah set huda ni kina xuttai i.e case jaba user leh afai accessToken rah refresh
  //token save garnah khojxah but not good practice..localStorage mah
  //mobile apps dev garda cookie set hudainah
})

const logoutUser = asyncHandler(async(req,res) => {
  //cookies clear garne
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined
      }
    },
    {
      new: true
    }
  )

  const options = {
    httpOnly: true,
    secure: true 
  }

  return res
  .status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json(new ApiResponse(200, {}, "User logged Out"))
})
export {
  registerUser,
  loginUser,
  logoutUser
}