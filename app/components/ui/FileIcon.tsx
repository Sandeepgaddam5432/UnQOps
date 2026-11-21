import React from 'react';
import { classNames } from '~/utils/classNames';

interface FileIconProps {
  filename: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function FileIcon({ filename, size = 'md', className }: FileIconProps) {
  const getFileExtension = (filename: string): string => {
    return filename.split('.').pop()?.toLowerCase() || '';
  };

  const getIconForExtension = (extension: string): string => {
    // Code files
    if (['js', 'jsx', 'ts', 'tsx'].includes(extension)) {
      return 'i-ph:file-js';
    }

    if (['html', 'htm', 'xhtml'].includes(extension)) {
      return 'i-ph:file-html';
    }

    if (['css', 'scss', 'sass', 'less'].includes(extension)) {
      return 'i-ph:file-css';
    }

    if (['json', 'jsonc'].includes(extension)) {
      return 'i-ph:brackets-curly';
    }

    if (['md', 'markdown'].includes(extension)) {
      return 'i-ph:file-text';
    }

    if (['py', 'pyc', 'pyd', 'pyo'].includes(extension)) {
      return 'i-ph:file-py';
    }

    if (['java', 'class', 'jar'].includes(extension)) {
      return 'i-ph:file-code';
    }

    if (['php'].includes(extension)) {
      return 'i-ph:file-code';
    }

    if (['rb', 'ruby'].includes(extension)) {
      return 'i-ph:file-rs';
    }

    if (['c', 'cpp', 'h', 'hpp', 'cc'].includes(extension)) {
      return 'i-ph:file-cpp';
    }

    if (['go'].includes(extension)) {
      return 'i-ph:file-rs';
    }

    if (['rs', 'rust'].includes(extension)) {
      return 'i-ph:file-rs';
    }

    if (['swift'].includes(extension)) {
      return 'i-ph:file-code';
    }

    if (['kt', 'kotlin'].includes(extension)) {
      return 'i-ph:file-code';
    }

    if (['dart'].includes(extension)) {
      return 'i-ph:file-code';
    }

    // Config files
    if (['yml', 'yaml'].includes(extension)) {
      return 'i-ph:file-cloud';
    }

    if (['xml', 'svg'].includes(extension)) {
      return 'i-ph:file-code';
    }

    if (['toml'].includes(extension)) {
      return 'i-ph:file-text';
    }

    if (['ini', 'conf', 'config'].includes(extension)) {
      return 'i-ph:file-text';
    }

    if (['env', 'env.local', 'env.development', 'env.production'].includes(extension)) {
      return 'i-ph:file-lock';
    }

    // Document files
    if (['pdf'].includes(extension)) {
      return 'i-ph:file-pdf';
    }

    if (['doc', 'docx'].includes(extension)) {
      return 'i-ph:file-doc';
    }

    if (['xls', 'xlsx'].includes(extension)) {
      return 'i-ph:file-xls';
    }

    if (['ppt', 'pptx'].includes(extension)) {
      return 'i-ph:file-ppt';
    }

    if (['txt'].includes(extension)) {
      return 'i-ph:file-text';
    }

    // Image files
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'ico', 'tiff'].includes(extension)) {
      return 'i-ph:file-image';
    }

    // Audio/Video files
    if (['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(extension)) {
      return 'i-ph:file-audio';
    }

    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(extension)) {
      return 'i-ph:file-video';
    }

    // Archive files
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(extension)) {
      return 'i-ph:file-zip';
    }

    // Special files
    if (filename === 'package.json') {
      return 'i-ph:package';
    }

    if (filename === 'tsconfig.json') {
      return 'i-ph:file-ts';
    }

    if (filename === 'README.md') {
      return 'i-ph:book-open';
    }

    if (filename === 'LICENSE') {
      return 'i-ph:scales';
    }

    if (filename === '.gitignore') {
      return 'i-ph:git-branch';
    }

    if (filename.startsWith('Dockerfile')) {
      return 'i-ph:file-code';
    }

    // Default
    return 'i-ph:file';
  };

  const getIconColorForExtension = (extension: string): string => {
    // Code files
    if (['js', 'jsx'].includes(extension)) {
      return 'text-od-warning';
    }

    if (['ts', 'tsx'].includes(extension)) {
      return 'text-od-info';
    }

    if (['html', 'htm', 'xhtml'].includes(extension)) {
      return 'text-od-warning';
    }

    if (['css', 'scss', 'sass', 'less'].includes(extension)) {
      return 'text-od-info';
    }

    if (['json', 'jsonc'].includes(extension)) {
      return 'text-od-warning';
    }

    if (['md', 'markdown'].includes(extension)) {
      return 'text-od-fg-muted';
    }

    if (['py', 'pyc', 'pyd', 'pyo'].includes(extension)) {
      return 'text-od-success';
    }

    if (['java', 'class', 'jar'].includes(extension)) {
      return 'text-od-danger';
    }

    if (['php'].includes(extension)) {
      return 'text-od-primary';
    }

    if (['rb', 'ruby'].includes(extension)) {
      return 'text-od-danger';
    }

    if (['c', 'cpp', 'h', 'hpp', 'cc'].includes(extension)) {
      return 'text-od-info';
    }

    if (['go'].includes(extension)) {
      return 'text-cyan-500';
    }

    if (['rs', 'rust'].includes(extension)) {
      return 'text-od-warning';
    }

    if (['swift'].includes(extension)) {
      return 'text-od-warning';
    }

    if (['kt', 'kotlin'].includes(extension)) {
      return 'text-od-primary';
    }

    if (['dart'].includes(extension)) {
      return 'text-cyan-400';
    }

    // Config files
    if (['yml', 'yaml'].includes(extension)) {
      return 'text-od-primary';
    }

    if (['xml'].includes(extension)) {
      return 'text-od-warning';
    }

    if (['svg'].includes(extension)) {
      return 'text-od-success';
    }

    if (['toml'].includes(extension)) {
      return 'text-od-fg-muted';
    }

    if (['ini', 'conf', 'config'].includes(extension)) {
      return 'text-od-fg-muted';
    }

    if (['env', 'env.local', 'env.development', 'env.production'].includes(extension)) {
      return 'text-od-success';
    }

    // Document files
    if (['pdf'].includes(extension)) {
      return 'text-od-danger';
    }

    if (['doc', 'docx'].includes(extension)) {
      return 'text-od-info';
    }

    if (['xls', 'xlsx'].includes(extension)) {
      return 'text-od-success';
    }

    if (['ppt', 'pptx'].includes(extension)) {
      return 'text-od-danger';
    }

    if (['txt'].includes(extension)) {
      return 'text-od-fg-muted';
    }

    // Image files
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'ico', 'tiff'].includes(extension)) {
      return 'text-pink-500';
    }

    // Audio/Video files
    if (['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(extension)) {
      return 'text-od-success';
    }

    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(extension)) {
      return 'text-od-info';
    }

    // Archive files
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(extension)) {
      return 'text-od-warning';
    }

    // Special files
    if (filename === 'package.json') {
      return 'text-od-danger';
    }

    if (filename === 'tsconfig.json') {
      return 'text-od-info';
    }

    if (filename === 'README.md') {
      return 'text-od-info';
    }

    if (filename === 'LICENSE') {
      return 'text-od-fg-muted';
    }

    if (filename === '.gitignore') {
      return 'text-od-warning';
    }

    if (filename.startsWith('Dockerfile')) {
      return 'text-od-info';
    }

    // Default
    return 'text-od-fg-soft';
  };

  const getSizeClass = (size: 'sm' | 'md' | 'lg'): string => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4';
      case 'md':
        return 'w-5 h-5';
      case 'lg':
        return 'w-6 h-6';
      default:
        return 'w-5 h-5';
    }
  };

  const extension = getFileExtension(filename);
  const icon = getIconForExtension(extension);
  const color = getIconColorForExtension(extension);
  const sizeClass = getSizeClass(size);

  return <span className={classNames(icon, color, sizeClass, className)} />;
}
