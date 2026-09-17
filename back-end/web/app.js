const form = document.querySelector("#generation-form");
const input = document.querySelector("#image-input");
const dropZone = document.querySelector("#drop-zone");
const preview = document.querySelector("#image-preview");
const uploadEmpty = document.querySelector("#upload-empty");
const changeImage = document.querySelector("#change-image");
const button = document.querySelector("#generate-button");
const views = ["empty", "loading", "complete", "error"];
let previewUrl;

function showView(name) {
  views.forEach((view) => {
    document.querySelector(`#result-${view}`).hidden = view !== name;
  });
}

function setFile(file) {
  if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    showError("Vui lòng chọn ảnh JPG, PNG hoặc WEBP.");
    return;
  }
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  preview.src = previewUrl;
  preview.hidden = false;
  uploadEmpty.hidden = true;
  changeImage.hidden = false;
}

input.addEventListener("change", () => setFile(input.files[0]));
changeImage.addEventListener("click", (event) => { event.preventDefault(); input.click(); });
["dragenter", "dragover"].forEach((eventName) => dropZone.addEventListener(eventName, (event) => {
  event.preventDefault(); dropZone.classList.add("dragging");
}));
["dragleave", "drop"].forEach((eventName) => dropZone.addEventListener(eventName, (event) => {
  event.preventDefault(); dropZone.classList.remove("dragging");
}));
dropZone.addEventListener("drop", (event) => setFile(event.dataTransfer.files[0]));

function showError(message) {
  document.querySelector("#error-message").textContent = message;
  showView("error");
}

function updateProgress(status, progress) {
  const processing = status === "processing";
  document.querySelector("#status-title").textContent = processing ? "Đang tạo hình ảnh..." : "Đang xếp hàng...";
  document.querySelector("#status-copy").textContent = processing
    ? "Mivy đang xử lý ý tưởng và hoàn thiện hình ảnh."
    : "Yêu cầu đang chờ đến lượt xử lý.";
  const displayProgress = processing ? Math.max(progress, 10) : progress;
  document.querySelector("#progress-bar").style.width = `${displayProgress}%`;
  document.querySelector("#progress-label").textContent = `${displayProgress}%`;
}

async function parseError(response) {
  try {
    const body = await response.json();
    return body.error?.message || "Có lỗi xảy ra khi gọi API.";
  } catch { return "Không thể kết nối tới API Mivy."; }
}

async function pollJob(jobId) {
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const response = await fetch(`/v1/generations/${jobId}`);
    if (!response.ok) throw new Error(await parseError(response));
    const job = await response.json();
    updateProgress(job.status, job.progress);
    if (job.status === "failed") throw new Error(job.error || "Quá trình tạo ảnh thất bại.");
    if (job.status === "completed") {
      const resultUrl = `/v1/generations/${jobId}/result`;
      document.querySelector("#result-image").src = `${resultUrl}?t=${Date.now()}`;
      document.querySelector("#download-result").href = resultUrl;
      showView("complete");
      return;
    }
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!input.files.length) { showError("Hãy chọn một ảnh sản phẩm trước."); return; }
  button.disabled = true;
  button.querySelector("span").textContent = "Đang gửi yêu cầu...";
  showView("loading");
  updateProgress("queued", 0);
  try {
    const response = await fetch("/v1/generations/images", { method: "POST", body: new FormData(form) });
    if (!response.ok) throw new Error(await parseError(response));
    const job = await response.json();
    document.querySelector("#job-id").textContent = `#${job.job_id.slice(0, 8)}`;
    button.querySelector("span").textContent = "Đang tạo ảnh...";
    await pollJob(job.job_id);
  } catch (error) {
    showError(error.message);
  } finally {
    button.disabled = false;
    button.querySelector("span").textContent = "Tạo ảnh quảng cáo";
  }
});
