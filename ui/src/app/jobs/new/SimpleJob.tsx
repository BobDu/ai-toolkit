'use client';
import { useMemo } from 'react';
import { modelArchs, ModelArch, groupedModelOptions, quantizationOptions, defaultQtype } from './options';
import { defaultDatasetConfig } from './jobConfig';
import { GroupedSelectOption, JobConfig, SelectOption } from '@/types';
import { objectCopy } from '@/utils/basic';
import { TextInput, SelectInput, Checkbox, FormGroup, NumberInput } from '@/components/formInputs';
import Card from '@/components/Card';
import { X } from 'lucide-react';
import AddSingleImageModal, { openAddImageModal } from '@/components/AddSingleImageModal';
import {FlipHorizontal2, FlipVertical2} from "lucide-react"

type Props = {
  jobConfig: JobConfig;
  setJobConfig: (value: any, key: string) => void;
  status: 'idle' | 'saving' | 'success' | 'error';
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  runId: string | null;
  gpuIDs: string | null;
  setGpuIDs: (value: string | null) => void;
  gpuList: any;
  datasetOptions: any;
};

const isDev = process.env.NODE_ENV === 'development';

export default function SimpleJob({
  jobConfig,
  setJobConfig,
  handleSubmit,
  status,
  runId,
  gpuIDs,
  setGpuIDs,
  gpuList,
  datasetOptions,
}: Props) {
  const modelArch = useMemo(() => {
    return modelArchs.find(a => a.name === jobConfig.config.process[0].model.arch) as ModelArch;
  }, [jobConfig.config.process[0].model.arch]);

  const isVideoModel = !!(modelArch?.group === 'video');

  const numTopCards = useMemo(() => {
    let count = 4; // job settings, model config, target config, save config
    if (modelArch?.additionalSections?.includes('model.multistage')) {
      count += 1; // add multistage card
    }
    if (!modelArch?.disableSections?.includes('model.quantize')) {
      count += 1; // add quantization card
    }
    return count;
    
  }, [modelArch]);

  let topBarClass = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6';

  if (numTopCards == 5) {
    topBarClass = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6';
  }
  if (numTopCards == 6) {
    topBarClass = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-6 gap-6';
  }

  const transformerQuantizationOptions: GroupedSelectOption[] | SelectOption[] = useMemo(() => {
    const hasARA = modelArch?.accuracyRecoveryAdapters && Object.keys(modelArch.accuracyRecoveryAdapters).length > 0;
    if (!hasARA) {
      return quantizationOptions;
    }
    let newQuantizationOptions = [
      {
        label: 'Standard | 标准',
        options: [quantizationOptions[0], quantizationOptions[1]],
      },
    ];

    // add ARAs if they exist for the model
    let ARAs: SelectOption[] = [];
    if (modelArch.accuracyRecoveryAdapters) {
      for (const [label, value] of Object.entries(modelArch.accuracyRecoveryAdapters)) {
         ARAs.push({ value, label });
      }
    }
    if (ARAs.length > 0) {
      newQuantizationOptions.push({
        label: 'Accuracy Recovery Adapters | 精度恢复适配器',
        options: ARAs,
      });
    }

    let additionalQuantizationOptions: SelectOption[] = [];
    // add the quantization options if they are not already included
    for (let i = 2; i < quantizationOptions.length; i++) {
      const option = quantizationOptions[i];
      additionalQuantizationOptions.push(option);
    }
    if (additionalQuantizationOptions.length > 0) {
      newQuantizationOptions.push({
        label: 'Additional Quantization Options | 其他量化选项',
        options: additionalQuantizationOptions,
      });
    }
    return newQuantizationOptions;
  }, [modelArch]);

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className={topBarClass}>
          <Card title="Job | 任务">
            <TextInput
              label="Training Name | 训练名称"
              value={jobConfig.config.name}
              docKey="config.name"
              onChange={value => setJobConfig(value, 'config.name')}
              placeholder="Enter training name | 输入训练名称"
              disabled={runId !== null}
              required
            />
            <SelectInput
              label="GPU ID | GPU编号"
              value={`${gpuIDs}`}
              docKey="gpuids"
              onChange={value => setGpuIDs(value)}
              options={gpuList.map((gpu: any) => ({ value: `${gpu.index}`, label: `GPU #${gpu.index}` }))}
            />
            <TextInput
              label="Trigger Word | 触发词"
              value={jobConfig.config.process[0].trigger_word || ''}
              docKey="config.process[0].trigger_word"
              onChange={(value: string | null) => {
                if (value?.trim() === '') {
                  value = null;
                }
                setJobConfig(value, 'config.process[0].trigger_word');
              }}
              placeholder=""
              required
            />
          </Card>

          {/* Model Configuration Section */}
          <Card title="Model | 模型">
            <SelectInput
              label="Model Architecture | 模型结构"
              value={jobConfig.config.process[0].model.arch}
              onChange={value => {
                const currentArch = modelArchs.find(a => a.name === jobConfig.config.process[0].model.arch);
                if (!currentArch || currentArch.name === value) {
                  return;
                }
                // update the defaults when a model is selected
                const newArch = modelArchs.find(model => model.name === value);

                // update vram setting
                if (!newArch?.additionalSections?.includes('model.low_vram')) {
                  setJobConfig(false, 'config.process[0].model.low_vram');
                }

                // revert defaults from previous model
                for (const key in currentArch.defaults) {
                  setJobConfig(currentArch.defaults[key][1], key);
                }

                if (newArch?.defaults) {
                  for (const key in newArch.defaults) {
                    setJobConfig(newArch.defaults[key][0], key);
                  }
                }
                // set new model
                setJobConfig(value, 'config.process[0].model.arch');

                // update datasets
                const hasControlPath = newArch?.additionalSections?.includes('datasets.control_path') || false;
                const hasNumFrames = newArch?.additionalSections?.includes('datasets.num_frames') || false;
                const controls = newArch?.controls ?? [];
                const datasets = jobConfig.config.process[0].datasets.map(dataset => {
                  const newDataset = objectCopy(dataset);
                  newDataset.controls = controls;
                  if (!hasControlPath) {
                    newDataset.control_path = null; // reset control path if not applicable
                  }
                  if (!hasNumFrames) {
                    newDataset.num_frames = 1; // reset num_frames if not applicable
                  }
                  return newDataset;
                });
                setJobConfig(datasets, 'config.process[0].datasets');

                // update samples
                const hasSampleCtrlImg = newArch?.additionalSections?.includes('sample.ctrl_img') || false;
                const samples = jobConfig.config.process[0].sample.samples.map(sample => {
                  const newSample = objectCopy(sample);
                  if (!hasSampleCtrlImg) {
                    delete newSample.ctrl_img; // remove ctrl_img if not applicable
                  }
                  return newSample;
                });
                setJobConfig(samples, 'config.process[0].sample.samples');
              }}
              options={groupedModelOptions}
            />
            <TextInput
              label="Name or Path | 名称或路径"
              value={jobConfig.config.process[0].model.name_or_path}
              docKey="config.process[0].model.name_or_path"
              onChange={(value: string | null) => {
                if (value?.trim() === '') {
                  value = null;
                }
                setJobConfig(value, 'config.process[0].model.name_or_path');
              }}
              placeholder=""
              required
            />
            {modelArch?.additionalSections?.includes('model.low_vram') && (
              <FormGroup label="Options | 选项">
                <Checkbox
                  label="Low VRAM | 低显存"
                  checked={jobConfig.config.process[0].model.low_vram}
                  onChange={value => setJobConfig(value, 'config.process[0].model.low_vram')}
                />
              </FormGroup>
            )}
          </Card>
          {modelArch?.disableSections?.includes('model.quantize') ? null : (
            <Card title="Quantization | 量化">
              <SelectInput
                label="Transformer | 纯思法模"
                value={jobConfig.config.process[0].model.quantize ? jobConfig.config.process[0].model.qtype : ''}
                onChange={value => {
                  if (value === '') {
                    setJobConfig(false, 'config.process[0].model.quantize');
                    value = defaultQtype;
                  } else {
                    setJobConfig(true, 'config.process[0].model.quantize');
                  }
                  setJobConfig(value, 'config.process[0].model.qtype');
                }}
                options={transformerQuantizationOptions}
              />
              <SelectInput
                label="Text Encoder | 文本编码器"
                value={jobConfig.config.process[0].model.quantize_te ? jobConfig.config.process[0].model.qtype_te : ''}
                onChange={value => {
                  if (value === '') {
                    setJobConfig(false, 'config.process[0].model.quantize_te');
                    value = defaultQtype;
                  } else {
                    setJobConfig(true, 'config.process[0].model.quantize_te');
                  }
                  setJobConfig(value, 'config.process[0].model.qtype_te');
                }}
                options={quantizationOptions}
              />
            </Card>
          )}
          {modelArch?.additionalSections?.includes('model.multistage') && (
            <Card title="Multistage | 多阶段">
              <FormGroup label="Stages to Train | 训练阶段" docKey={'model.multistage'}>
                <Checkbox
                  label="High Noise | 高噪声"
                  checked={jobConfig.config.process[0].model.model_kwargs?.train_high_noise || false}
                  onChange={value => setJobConfig(value, 'config.process[0].model.model_kwargs.train_high_noise')}
                />
                <Checkbox
                  label="Low Noise | 低噪声"
                  checked={jobConfig.config.process[0].model.model_kwargs?.train_low_noise || false}
                  onChange={value => setJobConfig(value, 'config.process[0].model.model_kwargs.train_low_noise')}
                />
              </FormGroup>
              <NumberInput
                  label="Switch Every | 切换间隔"
                  value={jobConfig.config.process[0].train.switch_boundary_every}
                  onChange={value => setJobConfig(value, 'config.process[0].train.switch_boundary_every')}
                  placeholder="eg. 1"
                  docKey={'train.switch_boundary_every'}
                  min={1}
                  required
                />
            </Card>
          )}
          <Card title="Target">
            <SelectInput
              label="Target Type | 目标类型"
              value={jobConfig.config.process[0].network?.type ?? 'lora'}
              onChange={value => setJobConfig(value, 'config.process[0].network.type')}
              options={[
                { value: 'lora', label: 'LoRA | 洛拉' },
                { value: 'lokr', label: 'LoKr | 洛克尔' },
              ]}
            />
            {jobConfig.config.process[0].network?.type == 'lokr' && (
              <SelectInput
                label="LoKr Factor | 洛克尔因子"
                value={`${jobConfig.config.process[0].network?.lokr_factor ?? -1}`}
                onChange={value => setJobConfig(parseInt(value), 'config.process[0].network.lokr_factor')}
                options={[
                  { value: '-1', label: 'Auto | 自动' },
                  { value: '4', label: '4' },
                  { value: '8', label: '8' },
                  { value: '16', label: '16' },
                  { value: '32', label: '32' },
                ]}
              />
            )}
            {jobConfig.config.process[0].network?.type == 'lora' && (
              <>
                <NumberInput
                  label="Linear Rank | 线性秩"
                  value={jobConfig.config.process[0].network.linear}
                  onChange={value => {
                    console.log('onChange', value);
                    setJobConfig(value, 'config.process[0].network.linear');
                    setJobConfig(value, 'config.process[0].network.linear_alpha');
                  }}
                  placeholder="eg. 16"
                  min={0}
                  max={1024}
                  required
                />
                {modelArch?.disableSections?.includes('network.conv') ? null : (
                  <NumberInput
                    label="Conv Rank | 卷积秩"
                    value={jobConfig.config.process[0].network.conv}
                    onChange={value => {
                      console.log('onChange', value);
                      setJobConfig(value, 'config.process[0].network.conv');
                      setJobConfig(value, 'config.process[0].network.conv_alpha');
                    }}
                    placeholder="eg. 16"
                    min={0}
                    max={1024}
                  />
                )}
              </>
            )}
          </Card>
          <Card title="Save | 保存">
            <SelectInput
              label="Data Type | 数据类型"
              value={jobConfig.config.process[0].save.dtype}
              onChange={value => setJobConfig(value, 'config.process[0].save.dtype')}
              options={[
                { value: 'bf16', label: 'BF16 | 16位脑浮点' },
                { value: 'fp16', label: 'FP16 | 16位浮点' },
                { value: 'fp32', label: 'FP32 | 32位浮点' },
              ]}
            />
            <NumberInput
              label="Save Every | 保存间隔"
              value={jobConfig.config.process[0].save.save_every}
              onChange={value => setJobConfig(value, 'config.process[0].save.save_every')}
              placeholder="eg. 250"
              min={1}
              required
            />
            <NumberInput
              label="Max Step Saves to Keep | 最大保留步数"
              value={jobConfig.config.process[0].save.max_step_saves_to_keep}
              onChange={value => setJobConfig(value, 'config.process[0].save.max_step_saves_to_keep')}
              placeholder="eg. 4"
              min={1}
              required
            />
          </Card>
        </div>
        <div>
          <Card title="Training | 训练">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              <div>
                <NumberInput
                  label="Batch Size | 批次大小"
                  value={jobConfig.config.process[0].train.batch_size}
                  onChange={value => setJobConfig(value, 'config.process[0].train.batch_size')}
                  placeholder="eg. 4"
                  min={1}
                  required
                />
                <NumberInput
                  label="Gradient Accumulation | 梯度累积"
                  className="pt-2"
                  value={jobConfig.config.process[0].train.gradient_accumulation}
                  onChange={value => setJobConfig(value, 'config.process[0].train.gradient_accumulation')}
                  placeholder="eg. 1"
                  min={1}
                  required
                />
                <NumberInput
                  label="Steps | 训练步数"
                  className="pt-2"
                  value={jobConfig.config.process[0].train.steps}
                  onChange={value => setJobConfig(value, 'config.process[0].train.steps')}
                  placeholder="eg. 2000"
                  min={1}
                  required
                />
              </div>
              <div>
                <SelectInput
                  label="Optimizer | 优化器"
                  value={jobConfig.config.process[0].train.optimizer}
                  onChange={value => setJobConfig(value, 'config.process[0].train.optimizer')}
                  options={[
                    { value: 'adamw8bit', label: 'AdamW8Bit | 亚当W8比特' },
                    { value: 'adafactor', label: 'Adafactor | 阿达因子' },
                  ]}
                />
                <NumberInput
                  label="Learning Rate | 学习率"
                  className="pt-2"
                  value={jobConfig.config.process[0].train.lr}
                  onChange={value => setJobConfig(value, 'config.process[0].train.lr')}
                  placeholder="eg. 0.0001"
                  min={0}
                  required
                />
                <NumberInput
                  label="Weight Decay | 权重衰减"
                  className="pt-2"
                  value={jobConfig.config.process[0].train.optimizer_params.weight_decay}
                  onChange={value => setJobConfig(value, 'config.process[0].train.optimizer_params.weight_decay')}
                  placeholder="eg. 0.0001"
                  min={0}
                  required
                />
              </div>
              <div>
                {modelArch?.disableSections?.includes('train.timestep_type') ? null : (
                  <SelectInput
                    label="Timestep Type | 时间步类型"
                    value={jobConfig.config.process[0].train.timestep_type}
                    disabled={modelArch?.disableSections?.includes('train.timestep_type') || false}
                    onChange={value => setJobConfig(value, 'config.process[0].train.timestep_type')}
                    options={[
                      { value: 'sigmoid', label: 'Sigmoid | S型函数' },
                      { value: 'linear', label: 'Linear | 线性' },
                      { value: 'shift', label: 'Shift | 偏移' },
                      { value: 'weighted', label: 'Weighted | 加权' },
                    ]}
                  />
                )}
                <SelectInput
                  label="Timestep Bias | 时间步偏差"
                  className="pt-2"
                  value={jobConfig.config.process[0].train.content_or_style}
                  onChange={value => setJobConfig(value, 'config.process[0].train.content_or_style')}
                  options={[
                    { value: 'balanced', label: 'Balanced | 平衡' },
                    { value: 'content', label: 'High Noise | 高噪声' },
                    { value: 'style', label: 'Low Noise | 低噪声' },
                  ]}
                />
                <SelectInput
                  label="Noise Scheduler | 噪声调度器"
                  className="pt-2"
                  value={jobConfig.config.process[0].train.noise_scheduler}
                  onChange={value => setJobConfig(value, 'config.process[0].train.noise_scheduler')}
                  options={[
                    { value: 'flowmatch', label: 'FlowMatch | 流匹配' },
                    { value: 'ddpm', label: 'DDPM | 去噪扩散概率模型' },
                  ]}
                />
              </div>
              <div>
                <FormGroup label="EMA (Exponential Moving Average) | 指数移动平均">
                  <Checkbox
                    label="Use EMA | 使用EMA"
                    className="pt-1"
                    checked={jobConfig.config.process[0].train.ema_config?.use_ema || false}
                    onChange={value => setJobConfig(value, 'config.process[0].train.ema_config.use_ema')}
                  />
                </FormGroup>
                {jobConfig.config.process[0].train.ema_config?.use_ema && (
                  <NumberInput
                    label="EMA Decay | EMA衰减"
                    className="pt-2"
                    value={jobConfig.config.process[0].train.ema_config?.ema_decay as number}
                    onChange={value => setJobConfig(value, 'config.process[0].train.ema_config?.ema_decay')}
                    placeholder="eg. 0.99"
                    min={0}
                  />
                )}

                <FormGroup label="Text Encoder Optimizations | 文本编码器优化" className="pt-2">
                  <Checkbox
                    label="Unload TE | 卸载TE"
                    checked={jobConfig.config.process[0].train.unload_text_encoder || false}
                    docKey={'train.unload_text_encoder'}
                    onChange={value => {
                      setJobConfig(value, 'config.process[0].train.unload_text_encoder');
                      if (value) {
                        setJobConfig(false, 'config.process[0].train.cache_text_embeddings');
                      }
                    }}
                  />
                  <Checkbox
                    label="Cache Text Embeddings | 缓存文本嵌入"
                    checked={jobConfig.config.process[0].train.cache_text_embeddings || false}
                    docKey={'train.cache_text_embeddings'}
                    onChange={value => {
                      setJobConfig(value, 'config.process[0].train.cache_text_embeddings');
                      if (value) {
                        setJobConfig(false, 'config.process[0].train.unload_text_encoder');
                      }
                    }}
                  />
                </FormGroup>
              </div>
              <div>
                <FormGroup label="Regularization | 正则化">
                  <Checkbox
                    label="Differtial Output Preservation | 差分输出保持"
                    className="pt-1"
                    checked={jobConfig.config.process[0].train.diff_output_preservation || false}
                    onChange={value => setJobConfig(value, 'config.process[0].train.diff_output_preservation')}
                  />
                </FormGroup>
                {jobConfig.config.process[0].train.diff_output_preservation && (
                  <>
                    <NumberInput
                      label="DOP Loss Multiplier | DOP损失乘数"
                      className="pt-2"
                      value={jobConfig.config.process[0].train.diff_output_preservation_multiplier as number}
                      onChange={value =>
                        setJobConfig(value, 'config.process[0].train.diff_output_preservation_multiplier')
                      }
                      placeholder="eg. 1.0"
                      min={0}
                    />
                    <TextInput
                      label="DOP Preservation Class | DOP保持类别"
                      className="pt-2"
                      value={jobConfig.config.process[0].train.diff_output_preservation_class as string}
                      onChange={value => setJobConfig(value, 'config.process[0].train.diff_output_preservation_class')}
                      placeholder="eg. woman | 例如：女性"
                    />
                  </>
                )}
              </div>
            </div>
          </Card>
        </div>
        <div>
          <Card title="Datasets | 数据集">
            <>
              {jobConfig.config.process[0].datasets.map((dataset, i) => (
                <div key={i} className="p-4 rounded-lg bg-gray-800 relative">
                  <button
                    type="button"
                    onClick={() =>
                      setJobConfig(
                        jobConfig.config.process[0].datasets.filter((_, index) => index !== i),
                        'config.process[0].datasets',
                      )
                    }
                    className="absolute top-2 right-2 bg-red-800 hover:bg-red-700 rounded-full p-1 text-sm transition-colors"
                  >
                    <X />
                  </button>
                  <h2 className="text-lg font-bold mb-4">Dataset {i + 1} | 数据集 {i + 1}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                      <SelectInput
                        label="Dataset | 数据集"
                        value={dataset.folder_path}
                        onChange={value => setJobConfig(value, `config.process[0].datasets[${i}].folder_path`)}
                        options={datasetOptions}
                      />
                      {modelArch?.additionalSections?.includes('datasets.control_path') && (
                        <SelectInput
                          label="Control Dataset | 控制数据集"
                          docKey="datasets.control_path"
                          value={dataset.control_path ?? ''}
                          className="pt-2"
                          onChange={value =>
                            setJobConfig(value == '' ? null : value, `config.process[0].datasets[${i}].control_path`)
                          }
                          options={[{ value: '', label: <>&nbsp;</> }, ...datasetOptions]}
                        />
                      )}
                      <NumberInput
                        label="LoRA Weight | LoRA权重"
                        value={dataset.network_weight}
                        className="pt-2"
                        onChange={value => setJobConfig(value, `config.process[0].datasets[${i}].network_weight`)}
                        placeholder="eg. 1.0"
                      />
                    </div>
                    <div>
                      <TextInput
                        label="Default Caption | 默认标题"
                        value={dataset.default_caption}
                        onChange={value => setJobConfig(value, `config.process[0].datasets[${i}].default_caption`)}
                        placeholder="eg. A photo of a cat | 例如：一张猫的照片"
                      />
                      <NumberInput
                        label="Caption Dropout Rate | 标题丢弃率"
                        className="pt-2"
                        value={dataset.caption_dropout_rate}
                        onChange={value => setJobConfig(value, `config.process[0].datasets[${i}].caption_dropout_rate`)}
                        placeholder="eg. 0.05"
                        min={0}
                        required
                      />
                      {modelArch?.additionalSections?.includes('datasets.num_frames') && (
                        <NumberInput
                          label="Num Frames | 帧数"
                          className="pt-2"
                          docKey="datasets.num_frames"
                          value={dataset.num_frames}
                          onChange={value => setJobConfig(value, `config.process[0].datasets[${i}].num_frames`)}
                          placeholder="eg. 41"
                          min={1}
                          required
                        />
                      )}
                    </div>
                    <div>
                      <FormGroup label="Settings | 设置" className="">
                        <Checkbox
                          label="Cache Latents | 缓存潜在向量"
                          checked={dataset.cache_latents_to_disk || false}
                          onChange={value =>
                            setJobConfig(value, `config.process[0].datasets[${i}].cache_latents_to_disk`)
                          }
                        />
                        <Checkbox
                          label="Is Regularization | 是否正则化"
                          checked={dataset.is_reg || false}
                          onChange={value => setJobConfig(value, `config.process[0].datasets[${i}].is_reg`)}
                        />
                        {modelArch?.additionalSections?.includes('datasets.do_i2v') && (
                          <Checkbox
                            label="Do I2V | 图转视频"
                            checked={dataset.do_i2v || false}
                            onChange={value => setJobConfig(value, `config.process[0].datasets[${i}].do_i2v`)}
                            docKey="datasets.do_i2v"
                          />
                        )}
                      </FormGroup>
                      <FormGroup label="Flipping | 翻转" docKey={'datasets.flip'} className="mt-2">
                        <Checkbox
                          label={<>Flip X | 水平翻转 <FlipHorizontal2 className="inline-block w-4 h-4 ml-1" /></>}
                          checked={dataset.flip_x || false}
                          onChange={value => setJobConfig(value, `config.process[0].datasets[${i}].flip_x`)}
                        />
                        <Checkbox
                          label={<>Flip Y | 垂直翻转 <FlipVertical2 className="inline-block w-4 h-4 ml-1" /></>}
                          checked={dataset.flip_y || false}
                          onChange={value => setJobConfig(value, `config.process[0].datasets[${i}].flip_y`)}
                        />
                      </FormGroup>
                    </div>
                    <div>
                      <FormGroup label="Resolutions | 分辨率" className="pt-2">
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            [256, 512, 768],
                            [1024, 1280, 1536],
                          ].map(resGroup => (
                            <div key={resGroup[0]} className="space-y-2">
                              {resGroup.map(res => (
                                <Checkbox
                                  key={res}
                                  label={res.toString()}
                                  checked={dataset.resolution.includes(res)}
                                  onChange={value => {
                                    const resolutions = dataset.resolution.includes(res)
                                      ? dataset.resolution.filter(r => r !== res)
                                      : [...dataset.resolution, res];
                                    setJobConfig(resolutions, `config.process[0].datasets[${i}].resolution`);
                                  }}
                                />
                              ))}
                            </div>
                          ))}
                        </div>
                      </FormGroup>
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const newDataset = objectCopy(defaultDatasetConfig);
                  // automaticallt add the controls for a new dataset
                  const controls = modelArch?.controls ?? [];
                  newDataset.controls = controls;
                  setJobConfig([...jobConfig.config.process[0].datasets, newDataset], 'config.process[0].datasets');
                }}
                className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Add Dataset | 添加数据集
              </button>
            </>
          </Card>
        </div>
        <div>
          <Card title="Sample | 采样">
            <div
              className={
                isVideoModel
                  ? 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6'
                  : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'
              }
            >
              <div>
                <NumberInput
                  label="Sample Every | 采样间隔"
                  value={jobConfig.config.process[0].sample.sample_every}
                  onChange={value => setJobConfig(value, 'config.process[0].sample.sample_every')}
                  placeholder="eg. 250"
                  min={1}
                  required
                />
                <SelectInput
                  label="Sampler | 采样器"
                  className="pt-2"
                  value={jobConfig.config.process[0].sample.sampler}
                  onChange={value => setJobConfig(value, 'config.process[0].sample.sampler')}
                  options={[
                    { value: 'flowmatch', label: 'FlowMatch | 流匹配' },
                    { value: 'ddpm', label: 'DDPM | 去噪扩散概率模型' },
                  ]}
                />
                <NumberInput
                  label="Guidance Scale | 引导强度"
                  value={jobConfig.config.process[0].sample.guidance_scale}
                  onChange={value => setJobConfig(value, 'config.process[0].sample.guidance_scale')}
                  placeholder="eg. 1.0"
                  className="pt-2"
                  min={0}
                  required
                />
                <NumberInput
                  label="Sample Steps | 采样步数"
                  value={jobConfig.config.process[0].sample.sample_steps}
                  onChange={value => setJobConfig(value, 'config.process[0].sample.sample_steps')}
                  placeholder="eg. 1"
                  className="pt-2"
                  min={1}
                  required
                />
              </div>
              <div>
                <NumberInput
                  label="Width | 宽度"
                  value={jobConfig.config.process[0].sample.width}
                  onChange={value => setJobConfig(value, 'config.process[0].sample.width')}
                  placeholder="eg. 1024"
                  min={0}
                  required
                />
                <NumberInput
                  label="Height | 高度"
                  value={jobConfig.config.process[0].sample.height}
                  onChange={value => setJobConfig(value, 'config.process[0].sample.height')}
                  placeholder="eg. 1024"
                  className="pt-2"
                  min={0}
                  required
                />
                {isVideoModel && (
                  <div>
                    <NumberInput
                      label="Num Frames | 帧数"
                      value={jobConfig.config.process[0].sample.num_frames}
                      onChange={value => setJobConfig(value, 'config.process[0].sample.num_frames')}
                      placeholder="eg. 0"
                      className="pt-2"
                      min={0}
                      required
                    />
                    <NumberInput
                      label="FPS | 帧率"
                      value={jobConfig.config.process[0].sample.fps}
                      onChange={value => setJobConfig(value, 'config.process[0].sample.fps')}
                      placeholder="eg. 0"
                      className="pt-2"
                      min={0}
                      required
                    />
                  </div>
                )}
              </div>

              <div>
                <NumberInput
                  label="Seed | 随机种子"
                  value={jobConfig.config.process[0].sample.seed}
                  onChange={value => setJobConfig(value, 'config.process[0].sample.seed')}
                  placeholder="eg. 0"
                  min={0}
                  required
                />
                <Checkbox
                  label="Walk Seed | 种子游走"
                  className="pt-4 pl-2"
                  checked={jobConfig.config.process[0].sample.walk_seed}
                  onChange={value => setJobConfig(value, 'config.process[0].sample.walk_seed')}
                />
              </div>
              <div>
                <FormGroup label="Advanced Sampling | 高级采样" className="pt-2">
                  <div>
                    <Checkbox
                      label="Skip First Sample | 跳过首次采样"
                      className="pt-4"
                      checked={jobConfig.config.process[0].train.skip_first_sample || false}
                      onChange={value => setJobConfig(value, 'config.process[0].train.skip_first_sample')}
                    />
                  </div>
                  <div>
                    <Checkbox
                      label="Disable Sampling | 禁用采样"
                      className="pt-1"
                      checked={jobConfig.config.process[0].train.disable_sampling || false}
                      onChange={value => setJobConfig(value, 'config.process[0].train.disable_sampling')}
                    />
                  </div>
                </FormGroup>
              </div>
            </div>
            <FormGroup label={`Sample Prompts | 采样提示词 (${jobConfig.config.process[0].sample.samples.length})`} className="pt-2">
              <div></div>
            </FormGroup>
            {jobConfig.config.process[0].sample.samples.map((sample, i) => (
              <div key={i} className="rounded-lg pl-4 pr-1 mb-4 bg-gray-950">
                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <div className="flex">
                      <div className="flex-1">
                        <TextInput
                          label={`Prompt | 提示词`}
                          value={sample.prompt}
                          onChange={value => setJobConfig(value, `config.process[0].sample.samples[${i}].prompt`)}
                          placeholder="Enter prompt | 输入提示词"
                          required
                        />
                      </div>

                      {modelArch?.additionalSections?.includes('sample.ctrl_img') && (
                        <div
                          className="h-14 w-14 mt-2 ml-4 border border-gray-500 flex items-center justify-center rounded cursor-pointer hover:bg-gray-700 transition-colors"
                          style={{
                            backgroundImage: sample.ctrl_img
                              ? `url(${`/api/img/${encodeURIComponent(sample.ctrl_img)}`})`
                              : 'none',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            marginBottom: '-1rem',
                          }}
                          onClick={() => {
                            openAddImageModal(imagePath => {
                              console.log('Selected image path:', imagePath);
                              if (!imagePath) return;
                              setJobConfig(imagePath, `config.process[0].sample.samples[${i}].ctrl_img`);
                            });
                          }}
                        >
                          {!sample.ctrl_img && (
                            <div className="text-gray-400 text-xs text-center font-bold">Add Control Image | 添加控制图像</div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="pb-4"></div>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        setJobConfig(
                          jobConfig.config.process[0].sample.samples.filter((_, index) => index !== i),
                          'config.process[0].sample.samples',
                        )
                      }
                      className="rounded-full p-1 text-sm"
                    >
                      <X />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setJobConfig(
                  [...jobConfig.config.process[0].sample.samples, { prompt: '' }],
                  'config.process[0].sample.samples',
                )
              }
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Add Prompt | 添加提示词
            </button>
          </Card>
        </div>

        {status === 'success' && <p className="text-green-500 text-center">Training saved successfully! | 训练保存成功！</p>}
        {status === 'error' && <p className="text-red-500 text-center">Error saving training. Please try again. | 保存训练失败，请重试。</p>}
      </form>
      <AddSingleImageModal />
    </>
  );
}
