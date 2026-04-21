from datetime import datetime
from pathlib import Path
import os
import shutil
import uuid

import cv2
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import numpy as np
from ultralytics import YOLO

app = FastAPI()

BASE_DIR = Path(__file__).resolve().parent
UPLOADS = BASE_DIR / "uploads"
OUTPUTS = BASE_DIR / "outputs"
MODEL_PATH = BASE_DIR / "best.pt"

for folder in (UPLOADS, OUTPUTS):
    folder.mkdir(exist_ok=True)

frontend_origins = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Make generated files inside backend/outputs available to the frontend.
app.mount("/outputs", StaticFiles(directory=str(OUTPUTS)), name="outputs")

model = YOLO(str(MODEL_PATH))

incidents = []
notifications = []
SUPPORTED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".gif"}
SUPPORTED_IMAGE_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/bmp",
    "image/webp",
    "image/gif",
}


def log_image(message: str):
    """Keep image route logging consistent and easy to scan in demo runs."""
    print(f"[image] {message}")


def log_video(message: str):
    """Keep video route logging consistent and easy to scan in demo runs."""
    print(f"[video] {message}")


def build_output_url(request: Request, filename: str) -> str:
    """Build a full URL that the frontend can open directly."""
    return f"{str(request.base_url).rstrip('/')}/outputs/{filename}"


def get_output_format(filename: str | None) -> str | None:
    """Return the lowercase file extension without the leading dot."""
    if not filename:
        return None
    suffix = Path(filename).suffix.lower()
    return suffix[1:] if suffix.startswith(".") else suffix or None


def save_upload_file(file: UploadFile) -> Path:
    """Save the uploaded file to backend/uploads and return the saved path."""
    safe_name = f"{uuid.uuid4().hex}_{Path(file.filename or 'upload').name}"
    file_path = UPLOADS / safe_name

    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return file_path


def is_supported_image_upload(file: UploadFile) -> bool:
    filename = (file.filename or "").lower()
    suffix = Path(filename).suffix
    content_type = (file.content_type or "").lower()

    return (
        suffix in SUPPORTED_IMAGE_EXTENSIONS
        or content_type in SUPPORTED_IMAGE_CONTENT_TYPES
    )


def decode_uploaded_image(file_path: Path):
    """Decode a saved upload with OpenCV so invalid image files fail cleanly."""
    try:
        image_bytes = file_path.read_bytes()
    except Exception as error:
        raise ValueError(f"Could not read uploaded image: {error}") from error

    if not image_bytes:
        raise ValueError("The uploaded image file is empty.")

    image_array = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("The uploaded file could not be decoded as a valid image.")

    return image


def extract_detections(results) -> tuple[list[dict], bool, float]:
    """Convert YOLO results into API-friendly detection objects."""
    detections = []
    accident_detected = False
    best_confidence = 0.0

    for result in results:
        for box in result.boxes:
            class_id = int(box.cls[0].item())
            confidence = float(box.conf[0].item())
            label = str(model.names[class_id])
            bounding_box = [float(value) for value in box.xyxy[0].tolist()]

            detections.append(
                {
                    "label": label,
                    "score": confidence,
                    "box": bounding_box,
                }
            )

            if label.lower() == "accident":
                accident_detected = True
                best_confidence = max(best_confidence, confidence)

    return detections, accident_detected, best_confidence


def create_incident_record(
    *,
    media_type: str,
    source_file: str,
    accident_detected: bool,
    confidence: float,
    timestamp: str,
):
    """Store each processed upload so the dashboard keeps working."""
    incident_id = f"INC{len(incidents) + 1:04d}"
    location = "Uploaded Video" if media_type == "video" else "Uploaded Image"

    incident = {
        "id": incident_id,
        "timestamp": timestamp,
        "location": location,
        "confidence": confidence,
        "media_type": media_type,
        "status": "critical" if accident_detected else "processed",
        "accident_detected": accident_detected,
        "source_file": source_file,
        "latitude": 7.1907,
        "longitude": 125.4553,
    }
    incidents.append(incident)

    if accident_detected:
        title_prefix = "video " if media_type == "video" else ""
        notifications.append(
            {
                "id": f"NOT{len(notifications) + 1:04d}",
                "incident_id": incident_id,
                "title": "Critical Accident Detected",
                "message": (
                    f"Accident detected in {title_prefix}{source_file} "
                    f"({confidence:.2%} confidence)"
                ),
                "timestamp": timestamp,
                "severity": "critical",
                "read": False,
            }
        )


def create_video_writer(width: int, height: int, fps: float):
    """
    Try browser-friendly MP4 codecs first, then fall back to AVI-only codecs.
    Returns metadata about the opened writer plus whether the output should be
    exposed to the browser preview flow.
    """
    output_stem = f"detected_video_{uuid.uuid4().hex[:8]}"
    candidates = (
        {"codec": "avc1", "suffix": ".mp4", "browser_preview_safe": True},
        {"codec": "H264", "suffix": ".mp4", "browser_preview_safe": True},
        {"codec": "mp4v", "suffix": ".mp4", "browser_preview_safe": True},
        {"codec": "MJPG", "suffix": ".avi", "browser_preview_safe": False},
    )

    for candidate in candidates:
        output_name = f"{output_stem}{candidate['suffix']}"
        output_path = OUTPUTS / output_name
        log_video(
            "Trying output writer "
            f"codec={candidate['codec']} suffix={candidate['suffix']}"
        )
        try:
            writer = cv2.VideoWriter(
                str(output_path),
                cv2.VideoWriter_fourcc(*candidate["codec"]),
                fps,
                (width, height),
            )
            if writer is not None and writer.isOpened():
                return {
                    "writer": writer,
                    "output_path": output_path,
                    "output_name": output_name,
                    "codec": candidate["codec"],
                    "browser_preview_safe": candidate["browser_preview_safe"],
                }
            if writer is not None:
                writer.release()
            log_video(f"Codec {candidate['codec']} could not open a writer")
            if output_path.exists():
                output_path.unlink()
        except Exception as error:
            log_video(f"Codec {candidate['codec']} failed: {error}")
            if output_path.exists():
                output_path.unlink()
            continue

    log_video(
        "Warning: all video codecs failed. Annotated output will not be generated."
    )
    return {
        "writer": None,
        "output_path": None,
        "output_name": None,
        "codec": None,
        "browser_preview_safe": False,
    }


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
    }


@app.get("/api/incidents")
def get_incidents():
    return incidents[::-1]


@app.get("/api/notifications")
def get_notifications():
    return notifications[::-1]


@app.post("/api/detect/image")
async def detect_image(request: Request, file: UploadFile = File(...)):
    file_path = None
    try:
        if file is None:
            log_image("Request did not include an uploaded file")
            raise HTTPException(status_code=400, detail="No image file was uploaded.")

        if not file.filename:
            log_image("Uploaded image was missing a filename")
            raise HTTPException(status_code=400, detail="No image file was uploaded.")

        log_image(f"\nStarting image detection for: {file.filename}")

        if not is_supported_image_upload(file):
            log_image(
                "Rejected unsupported image upload "
                f"filename={file.filename!r} content_type={file.content_type!r}"
            )
            raise HTTPException(
                status_code=400,
                detail=(
                    "Unsupported image type. Please upload a JPG, PNG, BMP, WEBP, or GIF image."
                ),
            )

        file_path = save_upload_file(file)
        log_image(f"File saved to: {file_path}")

        try:
            decoded_image = decode_uploaded_image(file_path)
        except ValueError as error:
            log_image(f"Image decode failed: {error}")
            raise HTTPException(status_code=400, detail=str(error)) from error

        log_image(
            "Image decoded successfully "
            f"width={decoded_image.shape[1]} height={decoded_image.shape[0]}"
        )

        try:
            results = model.predict(decoded_image, verbose=False)
        except Exception as error:
            log_image(f"YOLO inference failed: {error}")
            raise HTTPException(
                status_code=500,
                detail="Image detection failed during model inference.",
            ) from error

        detections, accident_detected, best_confidence = extract_detections(results)
        log_image(
            "Detection complete: "
            f"{len(detections)} objects detected, "
            f"accident={accident_detected}, confidence={best_confidence:.2%}"
        )

        annotated_media_url = None
        annotated_media_available = False
        processing_notes = None
        annotated_media_warning = None
        output_name = f"result_{uuid.uuid4().hex[:8]}.jpg"
        output_path = OUTPUTS / output_name

        try:
            annotated_image = results[0].plot()
            write_succeeded = bool(cv2.imwrite(str(output_path), annotated_image))
        except Exception as error:
            write_succeeded = False
            log_image(f"Annotated image generation failed: {error}")

        if write_succeeded and output_path.exists() and output_path.stat().st_size > 0:
            annotated_media_url = build_output_url(request, output_name)
            annotated_media_available = True
            log_image(f"Annotated image saved to: {output_path}")
        else:
            if output_path.exists():
                output_path.unlink()
            annotated_media_warning = (
                "Image detection completed, but the backend could not save an annotated preview image."
            )
            processing_notes = (
                "Detection succeeded, but no annotated output image was available for browser preview."
            )
            log_image("Annotated image write failed; returning success without preview output")

        timestamp = datetime.now().isoformat()
        create_incident_record(
            media_type="image",
            source_file=file.filename or "uploaded_image",
            accident_detected=accident_detected,
            confidence=best_confidence,
            timestamp=timestamp,
        )

        return {
            "success": True,
            "accident_detected": accident_detected,
            "confidence": best_confidence,
            "media_type": "image",
            "timestamp": timestamp,
            "location": "Uploaded Image",
            "detections": detections,
            "annotated_media_url": annotated_media_url,
            "annotated_media_available": annotated_media_available,
            "annotated_media_previewable": annotated_media_available,
            "annotated_media_download_url": annotated_media_url,
            "annotated_media_format": get_output_format(output_name)
            if annotated_media_available
            else None,
            "annotated_media_warning": annotated_media_warning,
            "processing_notes": processing_notes,
        }
    except HTTPException:
        raise
    except Exception as error:
        log_image(f"Detection error: {error}")
        raise HTTPException(status_code=500, detail=f"Image detection failed: {error}")


@app.post("/api/detect/video")
async def detect_video(request: Request, file: UploadFile = File(...)):
    file_path = None
    cap = None
    writer = None
    output_path = None
    output_name = None
    output_url = None
    browser_preview_safe = False
    processing_notes = None

    try:
        log_video(f"\nStarting video detection for: {file.filename}")
        file_path = save_upload_file(file)
        log_video(f"File saved to: {file_path}")
        
        cap = cv2.VideoCapture(str(file_path))

        if not cap.isOpened():
            log_video("Could not open uploaded video file")
            raise HTTPException(status_code=400, detail="Could not open uploaded video.")

        fps = cap.get(cv2.CAP_PROP_FPS) or 0
        if fps <= 0:
            fps = 20.0

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
        if width <= 0 or height <= 0:
            log_video(f"Invalid video dimensions: {width}x{height}")
            raise HTTPException(status_code=400, detail="Uploaded video has invalid dimensions.")

        log_video(f"Video opened: width={width}, height={height}, fps={fps:.2f}")

        # Create the annotated output video inside backend/outputs.
        writer_info = create_video_writer(width, height, fps)
        writer = writer_info["writer"]
        output_path = writer_info["output_path"]
        output_name = writer_info["output_name"]
        browser_preview_safe = bool(writer_info["browser_preview_safe"])

        if writer is None:
            log_video("Video writer was not created. Annotated output will not be generated.")
        else:
            log_video(f"Codec used: {writer_info['codec']}")
            log_video(f"Output file path: {output_path}")

        accident_detected = False
        best_confidence = 0.0
        detection_samples = []
        max_detection_samples = 20
        processed_frames = 0
        frame_count = 0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        frame_skip = int(os.getenv('VIDEO_FRAME_SKIP', '0'))

        if frame_skip <= 1:
            if total_frames >= 3600:
                frame_skip = 4
            elif total_frames >= 900:
                frame_skip = 3
            else:
                frame_skip = 2

        log_video(f"Total frames: {total_frames}, frame_skip: {frame_skip}")
        last_annotated_frame = None

        while True:
            success, frame = cap.read()
            if not success:
                break

            frame_count += 1

            # Skip frames for faster processing
            if frame_count % frame_skip != 0:
                # Reuse previous annotated frame for skipped frames (if available)
                if writer is not None and last_annotated_frame is not None:
                    writer.write(last_annotated_frame)
                continue

            processed_frames += 1

            # Detect objects in the current frame, then draw boxes and labels.
            results = model.predict(frame, verbose=False)
            frame_detections, frame_has_accident, frame_best_confidence = extract_detections(results)
            annotated_frame = results[0].plot()
            last_annotated_frame = annotated_frame

            if writer is not None:
                writer.write(annotated_frame)

            if len(detection_samples) < max_detection_samples:
                remaining_slots = max_detection_samples - len(detection_samples)
                detection_samples.extend(frame_detections[:remaining_slots])

            if frame_has_accident:
                accident_detected = True
                best_confidence = max(best_confidence, frame_best_confidence)

        if processed_frames == 0:
            log_video("No readable frames found in uploaded video")
            raise HTTPException(status_code=400, detail="Uploaded video has no readable frames.")

        log_video(
            "Processed "
            f"{processed_frames}/{frame_count} frames "
            f"(skipped {frame_count - processed_frames} for speed)"
        )
        log_video(
            "Detection summary: "
            f"accident_detected={accident_detected}, confidence={best_confidence:.2%}"
        )

        timestamp = datetime.now().isoformat()
        create_incident_record(
            media_type="video",
            source_file=file.filename or "uploaded_video",
            accident_detected=accident_detected,
            confidence=best_confidence,
            timestamp=timestamp,
        )

        annotated_media_url = None
        annotated_media_warning = None
        annotated_media_previewable = False
        if writer is not None:
            writer.release()
            writer = None

        if output_path is not None and output_path.exists():
            output_size = output_path.stat().st_size
            log_video(f"Output file size: {output_size} bytes")

            if output_size == 0:
                output_path.unlink()
                log_video("Output file was empty and has been removed.")
            elif output_name is not None:
                output_url = build_output_url(request, output_name)
                if browser_preview_safe:
                    annotated_media_url = output_url
                    annotated_media_previewable = True
                    log_video(
                        "Previewable annotated output generated successfully "
                        f"with codec {writer_info['codec']}"
                    )
                    if writer_info["codec"] == "mp4v":
                        annotated_media_warning = (
                            "Annotated footage was generated as MP4, but playback can still vary by browser and codec support."
                        )
                        processing_notes = (
                            "OpenCV saved an MP4 fallback using mp4v. This often previews in browsers, but playback still varies by machine and browser."
                        )
                else:
                    log_video(
                        "Annotated output was generated in a non-previewable fallback format"
                    )
                    annotated_media_warning = (
                        "Annotated footage was generated, but this format is not reliably previewable in the browser on all machines."
                    )
                    processing_notes = (
                        "Detection completed and an annotated output file was saved, but it was not returned as a browser preview because the available codec/format was not considered reliably preview-safe."
                    )

        if output_url is None and writer_info["writer"] is None:
            annotated_media_warning = (
                "Video detection completed, but the backend could not create an annotated output file with any available codec."
            )
            processing_notes = (
                "The uploaded video was analyzed successfully, but OpenCV could not open any configured writer codec for annotated output generation on this machine."
            )
        elif output_url is None and output_name is not None:
            annotated_media_warning = (
                "Video detection completed, but the backend could not produce a previewable annotated output file."
            )
            processing_notes = (
                "An annotated output filename was reserved, but no browser-preview-safe video could be returned from the available codec path."
            )

        if annotated_media_url:
            log_video(f"annotated_media_url returned: yes ({annotated_media_url})")
        elif output_path is not None and output_path.exists():
            log_video(
                "annotated_media_url returned: no "
                "(output exists but was not marked browser-preview-safe)"
            )
        else:
            log_video("annotated_media_url returned: no")

        return {
            "success": True,
            "accident_detected": accident_detected,
            "confidence": best_confidence,
            "media_type": "video",
            "timestamp": timestamp,
            "location": "Uploaded Video",
            "detections": detection_samples,
            "annotated_media_url": annotated_media_url,
            "annotated_media_available": output_url is not None,
            "annotated_media_previewable": annotated_media_previewable,
            "annotated_media_download_url": output_url,
            "annotated_media_format": get_output_format(output_name),
            "annotated_media_warning": annotated_media_warning,
            "processing_notes": processing_notes,
        }
    except HTTPException:
        raise
    except Exception as error:
        log_video(f"Detection error: {error}")
        raise HTTPException(status_code=500, detail=f"Video detection failed: {error}")
    finally:
        if cap is not None:
            cap.release()
        if writer is not None:
            writer.release()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
