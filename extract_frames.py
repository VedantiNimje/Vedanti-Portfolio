import cv2
from pathlib import Path

video_path = Path("Public/light-character.mp4")
output_folder = Path("Public/light_curated_frames")

if not video_path.exists():
    print("ERROR: light-character.mp4 was not found.")
    print("Check that it is inside the Public folder.")
    raise SystemExit

output_folder.mkdir(parents=True, exist_ok=True)

video = cv2.VideoCapture(str(video_path))

if not video.isOpened():
    print("ERROR: Could not open the video.")
    raise SystemExit

total_frames = int(video.get(cv2.CAP_PROP_FRAME_COUNT))
fps = video.get(cv2.CAP_PROP_FPS)

print(f"Video frames: {total_frames}")
print(f"Video FPS: {fps:.2f}")

if total_frames <= 0:
    print("ERROR: No frames found in the video.")
    video.release()
    raise SystemExit

# Extract up to 27 evenly spaced frames.
frame_count = min(27, total_frames)
positions = [
    round(i * (total_frames - 1) / max(frame_count - 1, 1))
    for i in range(frame_count)
]

for i, position in enumerate(positions):
    video.set(cv2.CAP_PROP_POS_FRAMES, position)
    success, frame = video.read()

    if success:
        output_path = output_folder / f"frame_{i:03d}.webp"
        cv2.imwrite(str(output_path), frame)
        print(f"Saved: {output_path}")

video.release()
print("Finished extracting frames!")