const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err))
  } 
}

export {asyncHandler}
//return ni garnuparxah pura ko pura khud ko execute garne hoina
//accept ni fun rah return ni function i.r promise return
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