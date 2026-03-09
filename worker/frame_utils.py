"""
Video frame extraction utilities.
Extracts frames from video files into numbered image sequences
matching the folder structure CorridorKey expects.
"""

import os
import logging

import cv2

logger = logging.getLogger(__name__)


def extract_frames(video_path: str, output_dir: str, grayscale: bool = False) -> int:
    """
    Extract all frames from a video file into numbered PNGs.

    Args:
        video_path: Path to input video file.
        output_dir: Directory to save frames (created if needed).
        grayscale: If True, save as single-channel grayscale.

    Returns:
        Total number of frames extracted.
    """
    os.makedirs(output_dir, exist_ok=True)
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {video_path}")

    count = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if grayscale:
            if frame.ndim == 3:
                frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        out_path = os.path.join(output_dir, f"{count:05d}.png")
        cv2.imwrite(out_path, frame)
        count += 1

    cap.release()
    logger.info("Extracted %d frames from %s -> %s", count, video_path, output_dir)
    return count


def count_video_frames(video_path: str) -> int:
    """Get frame count from video without extracting."""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return 0
    count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.release()
    return count
