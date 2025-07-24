import React from 'react';
import { ConfigDoc } from '@/types';

const docs: { [key: string]: ConfigDoc } = {
  'config.name': {
    title: 'Training Name | 训练名称',
    description: (
      <>
        The name of the training job. This name will be used to identify the job in the system and will the the filename
        of the final model. It must be unique and can only contain alphanumeric characters, underscores, and dashes. No
        spaces or special characters are allowed.
        <br />
        训练作业的名称。此名称将用于在系统中标识该作业，并作为最终模型的文件名。它必须是唯一的，并且只能包含字母数字字符、下划线和短划线。不允许使用空格或特殊字符。
      </>
    ),
  },
  'gpuids': {
    title: 'GPU ID | GPU编号',
    description: (
      <>
        This is the GPU that will be used for training. Only one GPU can be used per job at a time via the UI currently. 
				However, you can start multiple jobs in parallel, each using a different GPU.
        <br />
        这是将用于训练的 GPU。目前，每个作业一次只能通过 UI 使用一个 GPU。 但是，您可以并行启动多个作业，每个作业使用不同的 GPU。
      </>
    ),
  },
  'config.process[0].trigger_word': {
    title: 'Trigger Word | 触发词',
    description: (
      <>
        Optional: This will be the word or token used to trigger your concept or character.
        <br />
        可选：这将是用于触发您的概念或角色的单词或标记。
				<br />
				<br />
				When using a trigger word, 
				If your captions do not contain the trigger word, it will be added automatically the beginning of the caption. If you do not have
				captions, the caption will become just the trigger word. If you want to have variable trigger words in your captions to put it in different spots,
				you can use the <code>{'[trigger]'}</code> placeholder in your captions. This will be automatically replaced with your trigger word.
        <br />
        使用触发词时，
        如果您的字幕不包含触发词，它将自动添加到字幕的开头。如果您没有字幕，字幕将仅包含触发词。如果您想在字幕中使用可变的触发词并将其放置在不同的位置，您可以在字幕中使用 <code>{'[trigger]'}</code> 占位符。这将自动替换为您的触发词。
        <br />
				<br />
				Trigger words will not automatically be added to your test prompts, so you will need to either add your trigger word manually or use the 
				<code>{'[trigger]'}</code> placeholder in your test prompts as well.
        <br />
        触发词不会自动添加到您的测试提示中，因此您需要手动添加触发词，或者在测试提示中使用 <code>{'[trigger]'}</code> 占位符。
      </>
    ),
  },
  'config.process[0].model.name_or_path': {
    title: 'Name or Path | 名称或路径',
    description: (
      <>
        The name of a diffusers repo on Huggingface or the local path to the base model you want to train from. The folder needs to be in 
				diffusers format for most models. For some models, such as SDXL and SD1, you can put the path to an all in one safetensors checkpoint here.
        <br />
        Huggingface 上扩散器代码库的名称，或您要训练的基础模型的本地路径。对于大多数模型，该文件夹需要采用扩散器格式。对于某些模型，例如 SDXL 和 SD1，您可以在此处输入一体化安全张量检查点的路径。
      </>
    ),
  },
  'datasets.control_path': {
    title: 'Control Dataset',
    description: (
      <>
        The control dataset needs to have files that match the filenames of your training dataset. They should be matching file pairs. 
        These images are fed as control/input images during training. 
      </>
    ),
  },
  'datasets.num_frames': {
    title: 'Number of Frames',
    description: (
      <>
        This sets the number of frames to shrink videos to for a video dataset. If this dataset is images, set this to 1 for one frame.
        If your dataset is only videos, frames will be extracted evenly spaced from the videos in the dataset. 
        <br/>
        <br/>
        It is best to trim your videos to the proper length before training. Wan is 16 frames a second. Doing 81 frames will result in a 5 second video.
        So you would want all of your videos trimmed to around 5 seconds for best results.
        <br/>
        <br/>
        Example: Setting this to 81 and having 2 videos in your dataset, one is 2 seconds and one is 90 seconds long, will result in 81 
        evenly spaced frames for each video making the 2 second video appear slow and the 90second video appear very fast.
      </>
    ),
  },
};

export const getDoc = (key: string | null | undefined): ConfigDoc | null => {
  if (key && key in docs) {
    return docs[key];
  }
  return null;
};

export default docs;
