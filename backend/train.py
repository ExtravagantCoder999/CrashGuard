from ultralytics import YOLO

model = YOLO("yolov8n.pt")
model.train(
    data="data.yaml",
    epochs=3,
    imgsz=640,
    device="cpu",
    workers=0,
    project=".",
    name="carcrash_train"
)