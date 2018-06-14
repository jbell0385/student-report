var express = require('express');
var router = express.Router();
require('dotenv').config();
var Axios = require('axios');
var parse = require('parse-link-header');
const Nightmare = require('nightmare');
require('nightmare-iframe-manager')(Nightmare);


/* GET home page. */
router.get('/', function(req, res, next) {
  let totalUsers = [];
  let accountID = 1;
  const baseHTML = "https://emspmg.instructure.com/api/v1";
  let userEP = `/accounts/${accountID}/users?`;
  const accessToken = "access_token=11002~diujLq40LVCzZNEJZYxqqbztlo9djCwAmjnnJDzBUuSVkdMv8EJHN4GQdeE7dt1v&per_page=100";

  

  totalUsers = Axios.get(`${baseHTML}${userEP}${accessToken}`)
    .then(async usersResponse=>{
      var linkHeader = usersResponse.headers.link;
      var parsed = parse(linkHeader);
      var userArr = [];
      userArr.push(...usersResponse.data);
      while(parsed.next){
        let nextUsers = await Axios.get(`${parsed.next.url}&${accessToken}`)
          .then(nextUsers => {
            userArr.push(...nextUsers.data);
            linkHeader = nextUsers.headers.link;
            parsed = parse(linkHeader);
          })
          .catch(error=>console.log(error))
      }
      return userArr;
    })
    .then((response)=>{
      res.render('index', {totalUsers:response});
    })
    .catch(error=>console.log(error))

});

router.get('/students/:id',(req,res)=>{
  const studentID = req.params.id;
  const baseHTML = "https://emspmg.instructure.com/api/v1";
  let enrollmentEP = `/users/${studentID}/courses?`;
  const accessToken = "access_token=11002~diujLq40LVCzZNEJZYxqqbztlo9djCwAmjnnJDzBUuSVkdMv8EJHN4GQdeE7dt1v&per_page=100";
  let totalEnrollments;
  
  totalEnrollments = Axios.get(`${baseHTML}${enrollmentEP}${accessToken}`)
    .then(async enrollments=>{
      var linkHeader = enrollments.headers.link;
      var parsed = parse(linkHeader);
      var enrollmentsArr = [];
      enrollmentsArr.push(...enrollments.data);
      while(parsed.next){
        let nextEnrollments = await Axios.get(`${parsed.next.url}&${accessToken}`)
          .then(nextEnrollments => {
            enrollmentsArr.push(...nextEnrollments.data);
            linkHeader = nextEnrollments.headers.link;
            parsed = parse(linkHeader);
          })
          .catch(error=>console.log(error))
      }
      return enrollmentsArr;
    })
    .then((response)=>{
      res.render('classes', {totalEnrollments:response, studentID:studentID});
    })
    .catch(error=>console.log(error))
})

router.get('/students/:sid/course/:cid', (req,res)=>{
  const studentID = req.params.sid;
  const courseID = req.params.cid;
  const baseHTML = "https://emspmg.instructure.com/api/v1";
  let enrollmentEP = `/courses/${courseID}/assignments?`;
  const accessToken = "access_token=11002~diujLq40LVCzZNEJZYxqqbztlo9djCwAmjnnJDzBUuSVkdMv8EJHN4GQdeE7dt1v&per_page=100";
  let totalAssignments;
  
  totalAssignments = Axios.get(`${baseHTML}${enrollmentEP}${accessToken}`)
    .then(async assignments=>{
      var linkHeader = assignments.headers.link;
      var parsed = parse(linkHeader);
      var assignmentsArr = [];
      assignmentsArr.push(...assignments.data);
      while(parsed.next){
        let nextAssignment = await Axios.get(`${parsed.next.url}&${accessToken}`)
          .then(nextAssignments => {
            assignmentsArr.push(...nextAssignments.data);
            linkHeader = nextAssignments.headers.link;
            parsed = parse(linkHeader);
          })
          .catch(error=>console.log(error))
      }
      return assignmentsArr;
    })
    .then((response)=>{
      res.render('assignments', {totalAssignments:response, studentID:studentID, courseID:courseID});
    })
    .catch(error=>console.log(error))
})

router.get('/students/:sid/course/:cid/assignment/:aid', (req,expressRes)=>{
  var studentID = req.params.sid;
  var courseID = req.params.cid;
  var assessmentID = req.params.aid;
  var sgUrl = `https://emspmg.instructure.com/courses/${courseID}/gradebook/speed_grader?assignment_id=${assessmentID}#%7B%22student_id%22%3A%22${studentID}%22%7D`;
  console.log('starting scrape...')
  scrape('https://emspmg.instructure.com/login/canvas', sgUrl)
    .then(res => {
      const html = res;
      console.log("res: ",res) //{}
      console.log("html: ",html);
      expressRes.render('report',{htmlData:html});
    })
  .catch(err => console.log(err));
})


function scrape(loginUrl, sgUrl) {
  const promise = new Promise((resolve, reject) => {

  const nightmare = Nightmare({show:true});

  nightmare
    .goto(loginUrl)
    .wait()
    .type('#pseudonym_session_unique_id', process.env.CANVAS_USER)
    .type('#pseudonym_session_password', process.env.CANVAS_PASSWORD)
    .click('button.Button--login')
    .wait(1500)
    .goto(sgUrl)
    .wait(2000)
    .enterIFrame('#speedgrader_iframe')
    .evaluate(()=>{
      const data = document.querySelector('body').innerHTML;
      return data;
    })
    // .exists('#speedgrader_iframe')
    // .evaluate(result=>console.log(result))
    // .evaluate(async (result)=>{
    //   console.log("result: ",result)
    //   if(result){
    //     return await nightmare
    //       .enterIFrame('#speedgrader_iframe')
    //       .wait(2000)
    //       .evaluate(() => {    
    //         const data = document.querySelector('body').innerHTML;
    //         return data;
    //       })
    //   }else{
    //     return `<h2>Student has not taken this assessment</h2>`;
    //   }
    // })
    .end()

  // instantiate
  nightmare.run((err, result) => {
      if (err) reject(err);
      console.log("result: ",result); 
      resolve(result);
    });
  });
  return promise;
}

module.exports = router;
