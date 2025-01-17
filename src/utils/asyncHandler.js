const asyncHandler = (requestHandler) => {
  (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err))
  } 
}

export {asyncHandler}
// db sanga kura vako vai garxah so as wrapper
// fun pass garne yo method mah ani execute garera wapas dinxa
// const asyncHandler = (fn) => async (req,res,next) => {
//   try {
//     await fn(req, res, next)
//   } catch(error) {
//     res.status(error.code || 500).json({
//       success: failed,
//       message: error.message
//     })
//   }
// }