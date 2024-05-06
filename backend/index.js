import express from "express"
import cors from "cors"
import multer from "multer"
import { v4 as uuidv4 } from "uuid"
import path from "path"
import fs from 'fs'
import {exec} from "child_process" // watch out
import { stderr, stdout } from "process"

const app = express()

// multer middleware
const storage = multer.diskStorage({
    destination: function(req, file, cb){
        cb(null, "./uploads")
    },
    filename: function(req, file, cb){
        cb(null, file.fieldname + "-" + uuidv4() + path.extname(file.originalname))
    }
})
// multer configuration
const upload = multer({storage: storage})

// cors middleware
app.use(
    cors({
        origin: ["http://localhost:3000", "http://localhost:5173" ],
        credentials: true
    })
)

app.use((req, res, next)=> {
    res.header("Access-Control-Allow-Origin", "*")
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
    );
    next()
})

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use("/uploads", express.static("uploads"))


app.post("/upload", upload.single('file'), (req, res) => {
    const lessonId = uuidv4()
    const videoPath = req.file.path
    const outputPath = `./uploads/courses/${lessonId}`
    const hlsPath = `${outputPath}/index.m3u8`
    
    console.log("HLS:", hlsPath);

    // check if the folder path where the m3u8 file will be stored exists or not. If not then create directory
    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, {recursive: true})
    }

    // ffmpeg
    const ffmpegCommand = `C:/ffmpeg/ffmpeg -i ${videoPath} -codec:v libx264 -codec:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${outputPath}/segment%03d.ts" -start_number 0 ${hlsPath}`

    // no queue because of POC, not to be used in production
    exec(ffmpegCommand, (error, stderr, stdout) => {
        if(error) {
            console.log('exec error', error);
        }
        console.log('stdout:', stdout);
        console.log('stderr:', stderr);

        const videoURL = `http://localhost:8000/uploads/courses/${lessonId}/index.m3u8`

        res.json({
            success: true,
            message: "Video converted to m3u8",
            lessonId: lessonId,
            videoURL: videoURL
        })

    })

})


app.get('/', (req, res)=> {
    res.json({
        message: "Server is up"
    })
})

app.listen(8000, ()=>{
    console.log("Server is listening on port 8000");
})

