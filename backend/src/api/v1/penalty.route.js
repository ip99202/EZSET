import Router from 'express'
import { asyncRoute, validateParams } from '../../utils/api'
import Penalty from '../../models/Penalty/Penalty'
import PenaltyConfig from '../../models/Penalty/PenaltyConfig'
import AttendanceUser from '../../models/attendanceUser'
import { perm } from '../../utils/role'
import { param, body, query } from 'express-validator'
const router = Router()
var moment = require('moment')

/**
 * @api {get} /penalty/read/:username 상벌점 조회
 * @apiDescription 사용자의 상벌점 조회
 * @apiName penaltyRead
 * @apiGroup Penalty
 * @apiPermission penalty.can.read
 *
 * @apiParam {String} username 조회할 사용자의 아이디
 * @apiParam {String} start_date 기간 조회 시작 날짜
 * @apiParam {String} end_date 기간 조회 종료 날짜
 *
 * @apiSuccess {Array} - 사용자의 상벌점 항목을 배열로 반환
 * @apiSuccess {String} type 상벌점 항목의 타입
 * @apiSuccess {String} date 상벌점 항목이 기록된 날짜
 * @apiSuccess {String} description 상벌점 항목의 설명
 * @apiSuccess {Number} point 상벌점 항목의 점수
 *
 * @apiSuccessExample {json} Success-Response:
 *      HTTP/1.1 200 OK
 *      {
 *          [{
 *              type:"지각",
 *              date:"2020-03-19",
 *              description:"지각",
 *              point:-1
 *          }]
 *      }
 */
router.get(
    '/read/:username',
    [
        perm('penalty').can('read'),
        param('username').isString(),
        query('start_date').isString(),
        query('end_date').isString(),
        validateParams,
    ],
    asyncRoute(async function(req, res) {
        var result = []
        var attendanceUser = await AttendanceUser.findOne({
            name: req.params.username,
        }).select({ _id: 0, __v: 0, name: 0 })

        var penaltyConfig = await PenaltyConfig.find()

        attendanceUser.status.forEach(element => {
            if (
                moment(element.date) >= moment(req.query.start_date) &&
                moment(element.date) <= moment(req.query.end_date)
            ) {
                if (element.state == 'late') {
                    var Val = penaltyConfig.find((item, idx) => {
                        return item.key === '지각'
                    })
                    result.push({
                        type_id: Val._id,
                        username: req.params.username,
                        type: '지각',
                        date: moment(element.date).format('YYYY-MM-DD'),
                        description: '지각',
                        point: Val.value,
                    })
                }
                if (element.state == 'absence') {
                    var val = penaltyConfig.find((item, idx) => {
                        return item.key === '결석'
                    })
                    result.push({
                        type_id: val._id,
                        username: req.params.username,
                        type: '결석',
                        date: moment(element.date).format('YYYY-MM-DD'),
                        description: '결석',
                        point: val.value,
                    })
                }
            }
        })

        var penalty = await Penalty.find({
            username: req.params.username,
            date: {
                $gte: moment(req.query.start_date).format('YYYY-MM-DD'),
                $lte: moment(req.query.end_date).format('YYYY-MM-DD'),
            },
        })

        penalty.forEach(element => {
            var val = penaltyConfig.find((item, idx) => {
                return item.key === element.type
            })
            result.push({
                type_id: val._id,
                username: req.params.username,
                type: element.type,
                date: moment(element.date).format('YYYY-MM-DD'),
                description: element.description,
                point: val.value,
            })
        })

        res.json(result)
    })
)

/**
 * @api {post} /penalty/write/ 상벌점 쓰기
 * @apiDescription 사용자의 상벌점 기록
 * @apiName penaltyWrite
 * @apiGroup Penalty
 * @apiPermission penalty.can.update
 *
 * @apiParam {String} username 조회할 사용자의 아이디
 * @apiParam {String} type 상벌점 항목 타입
 * @apiParam {String} description 상벌점 항목 설명
 * @apiParam {String} date 상벌점 항목 부여 날짜
 *
 * @apiParamExample {post} Request-Example:
 *      {
 *          username : "admin",
 *          type : "과제 지각",
 *          description : "과제 지각"
 *          date : "2020-03-19"
 *      }
 *
 * @apiSuccess {200} code 기록 성공시 코드
 *
 * @apiSuccessExample {json} Success-Response:
 *      HTTP/1.1 200 OK
 */
router.post(
    '/write',
    [
        perm('penalty').can('update'),
        body('type_id').isString(),
        body('type').isString(),
        body('date').isString(),
        body('username').isString(),
        body('description').isString(),
        validateParams,
    ],
    asyncRoute(async function(req, res) {
        var penalty = new Penalty()
        penalty.type_id = req.body.type_id
        penalty.type = req.body.type
        penalty.username = req.body.username
        penalty.date = req.body.date
        penalty.description = req.body.description

        await penalty.save()

        res.end()
    })
)

/**
 * @api {post} /penalty/delete/ 상벌점 삭제
 * @apiDescription 사용자의 상벌점 삭제
 * @apiName penaltyDelete
 * @apiGroup Penalty
 * @apiPermission penalty.can.update
 *
 * @apiParam {String} username 조회할 사용자의 아이디
 * @apiParam {String} type 상벌점 항목 타입
 * @apiParam {String} description 상벌점 항목 설명
 * @apiParam {String} date 상벌점 항목 부여 날짜
 *
 * @apiParamExample {post} Request-Example:
 *      {
 *          username : "admin",
 *          type : "과제 지각",
 *          description : "과제 지각"
 *          date : "2020-03-19"
 *      }
 *
 * @apiSuccess {200} code 기록 성공시 코드
 *
 * @apiSuccessExample {json} Success-Response:
 *      HTTP/1.1 200 OK
 */
router.delete(
    '/:username', [
        perm('penalty').can('update'),
        param('username').isString(),
        query('date').isString(),
        query('type').isString(),
        query('description').isString(),
        query('type_id').isString(),
        validateParams,
    ],
    asyncRoute(async function(req, res) {
        await Penalty.findOneAndDelete({
            type_id: req.query.type_id,
            type: req.query.type,
            username: req.params.username,
            date: req.query.date,
            description: req.query.description,
        })
        res.end()
    })
)

export default router
