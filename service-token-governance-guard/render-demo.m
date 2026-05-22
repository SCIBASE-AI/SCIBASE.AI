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
    NSColor *background = [NSColor colorWithCalibratedRed:0.05 green:0.07 blue:0.09 alpha:1.0];
    NSColor *panel = [NSColor colorWithCalibratedRed:0.10 green:0.14 blue:0.18 alpha:1.0];
    NSColor *accent = [NSColor colorWithCalibratedRed:0.18 green:0.70 blue:0.62 alpha:1.0];
    NSColor *muted = [NSColor colorWithCalibratedWhite:0.80 alpha:1.0];
    NSColor *safe = [NSColor colorWithCalibratedRed:0.06 green:0.43 blue:0.39 alpha:1.0];
    NSColor *hold = [NSColor colorWithCalibratedRed:0.72 green:0.33 blue:0.04 alpha:1.0];
    NSColor *deny = [NSColor colorWithCalibratedRed:0.50 green:0.08 blue:0.08 alpha:1.0];

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
      FillRect(context, 64, 72, 1152, 576, panel);
      FillRect(context, 64, 72, 1152, 7, accent);

      DrawText(@"Service Account Governance Guard", 104, 574, 42, NSFontWeightBold, NSColor.whiteColor);
      DrawText(@"Machine identity decisions for User & Project Management", 106, 538, 22, NSFontWeightRegular, muted);

      int phase = frame / (fps * 3);
      if (phase == 0) {
        DrawText(@"1. Evaluate token sponsorship and scope", 112, 454, 32, NSFontWeightSemibold, NSColor.whiteColor);
        DrawText(@"Owner sponsorship, MFA, verified integrations, expiry, and rotation are required before issuance.", 112, 410, 24, NSFontWeightRegular, muted);
        FillRect(context, 112, 288, 260, 82, safe);
        FillRect(context, 430, 288, 260, 82, hold);
        FillRect(context, 748, 288, 260, 82, deny);
        DrawText(@"1 retain", 150, 318, 28, NSFontWeightBold, NSColor.whiteColor);
        DrawText(@"2 review", 468, 318, 28, NSFontWeightBold, NSColor.whiteColor);
        DrawText(@"1 revoke", 786, 318, 28, NSFontWeightBold, NSColor.whiteColor);
      } else if (phase == 1) {
        DrawText(@"2. Block dangerous project automation", 112, 454, 32, NSFontWeightSemibold, NSColor.whiteColor);
        DrawText(@"Wildcard scopes, restricted downloads, missing use cases, and stale rotations become owner actions.", 112, 410, 24, NSFontWeightRegular, muted);
        NSArray *rows = @[
          @[@"wildcard_scope", @"critical"],
          @[@"token_expiry_missing", @"critical"],
          @[@"sensitive_protected_grant", @"critical"],
          @[@"approval_event_missing", @"medium"],
        ];
        for (NSUInteger index = 0; index < rows.count; index += 1) {
          CGFloat y = 326 - (CGFloat)index * 55;
          FillRect(context, 112, y, 808, 38, deny);
          DrawText(rows[index][0], 134, y + 8, 21, NSFontWeightSemibold, NSColor.whiteColor);
          DrawText([rows[index][1] uppercaseString], 770, y + 8, 21, NSFontWeightBold, accent);
        }
      } else {
        DrawText(@"3. Emit reviewer and owner packets", 112, 454, 32, NSFontWeightSemibold, NSColor.whiteColor);
        DrawText(@"JSON, Markdown, SVG, tests, and this MP4 show exactly why each token is retained, reviewed, or revoked.", 112, 410, 24, NSFontWeightRegular, muted);
        NSArray *metrics = @[
          @[@"Accounts evaluated", @"4"],
          @[@"Protected scopes blocked", @"4"],
          @[@"Owner actions", @"3"],
          @[@"Audit digest", @"sha256"],
        ];
        for (NSUInteger index = 0; index < metrics.count; index += 1) {
          CGFloat y = 326 - (CGFloat)index * 58;
          DrawText(metrics[index][0], 140, y, 25, NSFontWeightSemibold, NSColor.whiteColor);
          DrawText(metrics[index][1], 560, y, 25, NSFontWeightBold, accent);
        }
      }

      CGFloat progressWidth = ((CGFloat)frame / (CGFloat)(frameCount - 1)) * 1070;
      FillRect(context, 104, 116, 1070, 10, [NSColor colorWithCalibratedRed:0.17 green:0.20 blue:0.24 alpha:1.0]);
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
