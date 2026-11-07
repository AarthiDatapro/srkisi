UPDATE tbl_lesson_contents
SET file_name = NULL,
    file_path = NULL,
    file_size_bytes = NULL,
    content_url = NULL,
    duration_seconds = NULL,
    learning_json = NULL,
    telugu_file_name = NULL,
    telugu_file_path = NULL,
    telugu_file_size_bytes = NULL,
    telugu_learning_json = NULL
WHERE content_type = 'Overview';
