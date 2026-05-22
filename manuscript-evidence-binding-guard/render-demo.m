#import <AppKit/AppKit.h>
#import <AVFoundation/AVFoundation.h>

static void FillRect(CGContextRef context, CGFloat x, CGFloat y, CGFloat width, CGFloat height, NSColor *color) {
  CGContextSetFillColorWithColor(context, color.CGColor);
  CGContextFillRect(context, CGRectMake(x, y, width, height));
}

static void DrawText(NSString *text, CGFloat x, CGFloat y, CGFloat size, NSFontWeight weight, NSColor *color) {
  NSDictionary *attrs = @{
    NSFontAttributeName: [NSFont systemFontOfSize:size weight:weight],
    NSForegroundColorAttributeName: color,
  };
  [text drawAtPoint:NSMakePoint(x, y) withAttributes:attrs];
}

int main(void) {
  @autoreleasepool {
    const int width = 1280;
    const int height = 720;
    const int fps = 30;
    const int seconds = 9;
    const int frameCount = fps * seconds;

    NSString *reportsDir = [[[NSFileManager defaultManager] currentDirectoryPath] stringByAppendingPathComponent:@"reports"];
    [[NSFileManager defaultManager] createDirectoryAtPath:reportsDir withIntermediateDirectories:YES attributes:nil error:nil];
    NSString *outputPath = [reportsDir stringByAppendingPathComponent:@"demo.mp4"];
    [[NSFileManager defaultManager] removeItemAtPath:outputPath error:nil];

    NSError *error = nil;
    AVAssetWriter *writer = [AVAssetWriter assetWriterWithURL:[NSURL fileURLWithPath:outputPath] fileType:AVFileTypeMPEG4 error:&error];
    if (!writer) {
      NSLog(@"%@", error);
      return 1;
    }

    NSDictionary *settings = @{
      AVVideoCodecKey: AVVideoCodecTypeH264,
      AVVideoWidthKey: @(width),
      AVVideoHeightKey: @(height),
    };
    AVAssetWriterInput *input = [AVAssetWriterInput assetWriterInputWithMediaType:AVMediaTypeVideo outputSettings:settings];
    input.expectsMediaDataInRealTime = NO;

    NSDictionary *attributes = @{
      (NSString *)kCVPixelBufferPixelFormatTypeKey: @(kCVPixelFormatType_32ARGB),
      (NSString *)kCVPixelBufferWidthKey: @(width),
      (NSString *)kCVPixelBufferHeightKey: @(height),
    };
    AVAssetWriterInputPixelBufferAdaptor *adaptor =
      [AVAssetWriterInputPixelBufferAdaptor assetWriterInputPixelBufferAdaptorWithAssetWriterInput:input
                                                                       sourcePixelBufferAttributes:attributes];

    [writer addInput:input];
    [writer startWriting];
    [writer startSessionAtSourceTime:kCMTimeZero];

    CGColorSpaceRef colorSpace = CGColorSpaceCreateDeviceRGB();
    NSColor *background = [NSColor colorWithCalibratedRed:0.06 green:0.08 blue:0.10 alpha:1.0];
    NSColor *panel = [NSColor colorWithCalibratedRed:0.11 green:0.15 blue:0.18 alpha:1.0];
    NSColor *accent = [NSColor colorWithCalibratedRed:0.20 green:0.64 blue:0.50 alpha:1.0];
    NSColor *muted = [NSColor colorWithCalibratedWhite:0.82 alpha:1.0];
    NSColor *card = [NSColor colorWithCalibratedRed:0.18 green:0.29 blue:0.36 alpha:1.0];
    NSColor *danger = [NSColor colorWithCalibratedRed:0.25 green:0.12 blue:0.12 alpha:1.0];
    NSColor *warning = [NSColor colorWithCalibratedRed:1.00 green:0.67 blue:0.52 alpha:1.0];

    for (int frame = 0; frame < frameCount; frame += 1) {
      while (!input.readyForMoreMediaData) {
        [NSThread sleepForTimeInterval:0.01];
      }

      CVPixelBufferRef buffer = NULL;
      CVPixelBufferCreate(kCFAllocatorDefault, width, height, kCVPixelFormatType_32ARGB, NULL, &buffer);
      CVPixelBufferLockBaseAddress(buffer, 0);

      CGContextRef context = CGBitmapContextCreate(
        CVPixelBufferGetBaseAddress(buffer),
        width,
        height,
        8,
        CVPixelBufferGetBytesPerRow(buffer),
        colorSpace,
        kCGImageAlphaPremultipliedFirst
      );

      [NSGraphicsContext saveGraphicsState];
      [NSGraphicsContext setCurrentContext:[NSGraphicsContext graphicsContextWithCGContext:context flipped:NO]];

      FillRect(context, 0, 0, width, height, background);
      FillRect(context, 64, 74, 1152, 572, panel);
      FillRect(context, 64, 74, 1152, 6, accent);

      DrawText(@"Manuscript Evidence Binding Guard", 104, 574, 42, NSFontWeightBold, NSColor.whiteColor);
      DrawText(@"Submission release: publication_ready | audit digest: deterministic", 106, 538, 22, NSFontWeightRegular, muted);

      int phase = frame / (fps * 3);
      if (phase == 0) {
        DrawText(@"1. Bind every release claim to evidence", 112, 454, 32, NSFontWeightSemibold, NSColor.whiteColor);
        DrawText(@"Claims, figures, tables, and equations point to notebook outputs, datasets, and method citations.", 112, 410, 24, NSFontWeightRegular, muted);
        FillRect(context, 112, 280, 300, 92, card);
        FillRect(context, 490, 280, 300, 92, card);
        FillRect(context, 868, 280, 220, 92, card);
        DrawText(@"Claim", 138, 318, 28, NSFontWeightBold, NSColor.whiteColor);
        DrawText(@"Notebook output", 516, 318, 28, NSFontWeightBold, NSColor.whiteColor);
        DrawText(@"Dataset", 906, 318, 28, NSFontWeightBold, NSColor.whiteColor);
      } else if (phase == 1) {
        DrawText(@"2. Block stale or unapproved evidence", 112, 454, 32, NSFontWeightSemibold, NSColor.whiteColor);
        DrawText(@"Digest drift, upstream source changes, missing citations, and section hash mismatches become reviewer actions.", 112, 410, 24, NSFontWeightRegular, muted);
        NSArray *rows = @[
          @[@"evidence_digest_drift", @"critical"],
          @[@"upstream_source_digest_drift", @"critical"],
          @[@"section_version_mismatch", @"high"],
          @[@"citation_binding_missing", @"high"],
        ];
        for (NSUInteger index = 0; index < rows.count; index += 1) {
          CGFloat y = 324 - (CGFloat)index * 56;
          FillRect(context, 112, y, 760, 38, danger);
          DrawText(rows[index][0], 132, y + 8, 21, NSFontWeightSemibold, NSColor.whiteColor);
          DrawText([rows[index][1] uppercaseString], 760, y + 8, 21, NSFontWeightBold, warning);
        }
      } else {
        DrawText(@"3. Emit a release decision packet", 112, 454, 32, NSFontWeightSemibold, NSColor.whiteColor);
        DrawText(@"The maintainer gets JSON, Markdown, SVG, tests, and this MP4 walkthrough for fast review.", 112, 410, 24, NSFontWeightRegular, muted);
        NSArray *metrics = @[
          @[@"Claims held", @"2 / 3"],
          @[@"Assets held", @"1 / 3"],
          @[@"Current evidence", @"4 / 5"],
          @[@"Reviewer actions", @"10"],
        ];
        for (NSUInteger index = 0; index < metrics.count; index += 1) {
          CGFloat y = 326 - (CGFloat)index * 58;
          DrawText(metrics[index][0], 140, y, 25, NSFontWeightSemibold, NSColor.whiteColor);
          DrawText(metrics[index][1], 500, y, 25, NSFontWeightBold, accent);
        }
      }

      CGFloat progressWidth = ((CGFloat)frame / (CGFloat)(frameCount - 1)) * 1070;
      FillRect(context, 104, 116, 1070, 10, [NSColor colorWithCalibratedRed:0.18 green:0.21 blue:0.24 alpha:1.0]);
      FillRect(context, 104, 116, progressWidth, 10, accent);

      [NSGraphicsContext restoreGraphicsState];
      CGContextRelease(context);

      CMTime time = CMTimeMake(frame, fps);
      [adaptor appendPixelBuffer:buffer withPresentationTime:time];
      CVPixelBufferUnlockBaseAddress(buffer, 0);
      CVPixelBufferRelease(buffer);
    }

    [input markAsFinished];
    dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);
    [writer finishWritingWithCompletionHandler:^{
      dispatch_semaphore_signal(semaphore);
    }];
    dispatch_semaphore_wait(semaphore, DISPATCH_TIME_FOREVER);
    CGColorSpaceRelease(colorSpace);

    if (writer.status != AVAssetWriterStatusCompleted) {
      NSLog(@"Video writer failed: %@", writer.error);
      return 1;
    }
  }

  return 0;
}
