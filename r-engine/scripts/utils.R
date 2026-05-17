get_theme <- function(style) {
  switch(style,
    nature = theme_minimal(base_size = 10) + theme(
      plot.title        = element_text(size = 11, face = "bold", hjust = 0.5),
      plot.subtitle     = element_text(size = 9,  hjust = 0.5, color = "#555555"),
      panel.grid.minor  = element_blank(),
      panel.grid.major  = element_line(color = "#E8E8E8", linewidth = 0.3),
      panel.border      = element_rect(color = "#CCCCCC", fill = NA, linewidth = 0.5),
      plot.background   = element_rect(fill = "white", color = NA),
      legend.position   = "top",
      legend.text       = element_text(size = 8),
      axis.title        = element_text(size = 9),
      axis.text         = element_text(size = 8)
    ),
    cell = theme_minimal(base_size = 12) + theme(
      plot.title        = element_text(size = 13, face = "bold", hjust = 0.5),
      plot.subtitle     = element_text(size = 10, hjust = 0.5, color = "#444444"),
      panel.grid.minor  = element_blank(),
      panel.grid.major  = element_line(color = "#EBEBEB", linewidth = 0.3),
      panel.border      = element_rect(color = "#333333", fill = NA, linewidth = 0.8),
      plot.background   = element_rect(fill = "white", color = NA),
      legend.position   = "right",
      legend.box.background = element_rect(color = "#CCCCCC", linewidth = 0.3)
    ),
    dark = theme_minimal(base_size = 13) + theme(
      text              = element_text(color = "#E0E0E0"),
      plot.title        = element_text(size = 15, face = "bold", hjust = 0.5, color = "#FFFFFF"),
      plot.subtitle     = element_text(size = 10, hjust = 0.5, color = "#AAAAAA"),
      plot.caption      = element_text(color = "#777777"),
      panel.grid.minor  = element_blank(),
      panel.grid.major  = element_line(color = "#2D2D4E", linewidth = 0.4),
      plot.background   = element_rect(fill = "#12122A", color = NA),
      panel.background  = element_rect(fill = "#12122A", color = NA),
      legend.background = element_rect(fill = "#12122A", color = NA),
      legend.text       = element_text(color = "#CCCCCC"),
      legend.position   = "top",
      axis.text         = element_text(color = "#AAAAAA"),
      axis.title        = element_text(color = "#CCCCCC")
    ),
    # default
    theme_minimal(base_size = 13) + theme(
      plot.title        = element_text(size = 15, face = "bold", hjust = 0.5),
      plot.subtitle     = element_text(size = 10, hjust = 0.5, color = "#666666"),
      panel.grid.minor  = element_blank(),
      plot.background   = element_rect(fill = "white", color = NA),
      legend.position   = "top"
    )
  )
}

get_sig_colors <- function(style) {
  if (style == "dark") {
    c("Up" = "#FF6B6B", "Down" = "#74B9FF", "NS" = "#444466")
  } else {
    c("Up" = "#E05C5C", "Down" = "#5C9BE0", "NS" = "#AAAAAA")
  }
}

get_bg <- function(style) {
  if (style == "dark") "#12122A" else "white"
}

get_gradient <- function(style) {
  if (style == "dark") {
    list(low = "#74B9FF", mid = "#2D2D4E", high = "#FF6B6B")
  } else {
    list(low = "#3A7FC1", mid = "#F5F5F5", high = "#C0392B")
  }
}
