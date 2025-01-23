import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async(userId) => {
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
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ){
    throw new ApiError(400, "All fields are required")
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
  console.log(email);

  if(!username && !email) {
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

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken") 

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
        user: loggedInUser, accessToken, refreshToken
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

//End point where User can refresh token
const refreshAccessToken = asyncHandler(async(req, res) => {
  //refresh token access from cookie jaba end point hit hunxa
  //req.body.refreshToken mobile app use garda   
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if(!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request")
  }
  //incomingRefreshToken -> decodedToken
  //verify token--decoded token auxah 
  //user lai encrpyted token hamilai raw token chinxah jun db hunxa
  //decoded token mah payload optional hunnah sakxah

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )
    
    const user = await User.findById(decodedToken?._id)
  
    //fitious token ko lagi
    if(!user) {
      throw new ApiError(401, "Invalid refresh token")
    }
  
    //yaha sammah audah token valid hunuparxah
    //incomingRefreshToken full token from user
    //encoded wala generate vako lai save ni garako xah user mah
    //so match garne so to give User the access
    if(incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used")
    }
  
    //match garda new generate garera dine
    //cookies mah pathuane ho so options rakhnuparxah
    const options = {
      httpOnly: true,
      secure: true
    }
    const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new ApiResponse(
        200,
        {accessToken, refreshToken: newRefreshToken},
        "Access token refreshed"
      )
    )
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token") 
  }
})

const changeCurrentPassword = asyncHandler(async(req,res) => {
  const {oldPassword, newPassword} = req.body
  //confirm password ni garnah minxah
  //pw change garnah logged ni xah using authmiddleware(chalxah)
  //so confirm xah req.user mah user xah
  
  const user = await User.findById(req.user?._id)
  //true or false value milxah
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if(!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password")
  }

  //new password set
  user.password = newPassword
  await user.save({validateBeforeSave: false})

  return res
  .status(200)
  .json(new ApiResponse(200, {}, "Password changed successfully"))
})

//data mah req.user kina? req mah middleware run vaisako aba
//tesma user inject vaisako object mah
const getCurrentUser = asyncHandler(async(req,res) => {
  return res
  .status(200)
  .json(new ApiResponse(
    200, 
    req.user, 
    "Current user fetched successfully"
  ))
})

//text based data lai update garne
const updateAccountDetails = asyncHandler(async(req,res) => {
  const {fullName, email} = req.body
  //file upload garaunah arko controller mah garne End point
  //better approach
  if(!fullName || !email) {
    throw new ApiError(400, "All fields are required")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,   //query
    {
      $set: {
        fullName,
        email,
      }
    },
    {new: true}  //update paxi ko information return hunxa
  ).select("-password")

  return res
  .status(200)
  .json(new ApiResponse(200, user, "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async(req, res) => {
  const avatarLocalPath = req.file?.path 
  //local mah multer leh upload garxah
  //aba cloudinary mah upload garnu xainah vanye yeslai db mah save
  if(!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)

  if(!avatar.url){
    throw new ApiError(400, "Error while uploading on avatar")
  }

  //todo delete old image
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url
      }
    },
    {new: true}
  ).select("-password")
  //refrence liyera response pathaunu parxa
  //reponse pathauna user =
  //avatar = avatar.url thumnail mah string xah so 
  //avatar = avatar pass garda purai object pass hunxa
  return res
  .status(200)
  .json(
    new ApiResponse(200, user, "Avatar updated successfully")
  )
})

const updateUserCoverImage = asyncHandler(async(req,res) => {
  const coverImageLocalPath = req.file?.path

  if(!coverImageLocalPath) {
    throw new ApiError(400, "Cover Image file is missing")
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if(!coverImage.url) {
    throw new ApiError(400, "Error while uploading on cover image")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url
      }
    },
    {new: true}
  ).select("-password")

  return res
  .status(200)
  .json(
    new ApiResponse(200, user, "Cover image updated successfully")
  )
})

const getUserChannelProfile = asyncHandler(async(req,res) => {
  //channel profile chahida URL mah janxum so req.params
  const {username} = req.params
  
  if(!username?.trim()) {
    throw new ApiError(400,"Username is missing")
  }

  //username bata document find garne query chalayera
  //User.find({username}) dababase bata user line ani tesko bases
  //mah aggregation pipeline launu vanda direct nai aggregation launa milxa
  //using match field sabai bata 1 document find garxah so saving garnah
  //aggregate returns array mah multiple value
  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase()
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers"
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo"
      }
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers"
        },
        channelsSubscribedToCount: {
          $size: "subscribedTo"
        },//duita info aja add gareko document mah users modelmah
        isSubscribed: {
          $cond: {
            if: {$in: [req.user?._id, "$subscribers.subsciber"]},
            then: true,
            else: false
          }
        }
      }
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1
      }
    }
  ])

  if(!channel?.length) {
    throw new ApiError(404, "channel doesnot exists")
  }

  return res
  .status(200)
  .json(
    new ApiResponse(200, channel[0], "User channel fetched successfully")
  )
})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword, 
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage
}